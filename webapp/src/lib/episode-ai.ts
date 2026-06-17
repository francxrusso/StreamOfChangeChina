type GenerateEpisodeAIInput = {
  serieTitle: string;
  episodeTitle: string | null;
  season: number | null;
  episodeNumber: number | null;
  transcript: string;
  episodeLink: string | null;
};

type GenerateEpisodeAIOptions = {
  includeOnlineContext: boolean;
};

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_OPENAI_MODEL = "gpt-5.4-mini";
const MAX_TRANSCRIPT_CHARS = 65000;

function getOpenAIConfig() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY non configurata. Aggiungila nelle variabili ambiente e riprova.");
  }

  return {
    apiKey,
    model: process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL
  };
}

function compactTranscript(transcript: string) {
  const cleanTranscript = transcript.replace(/\s+/g, " ").trim();

  if (cleanTranscript.length <= MAX_TRANSCRIPT_CHARS) {
    return cleanTranscript;
  }

  const head = cleanTranscript.slice(0, Math.floor(MAX_TRANSCRIPT_CHARS * 0.55));
  const tail = cleanTranscript.slice(-Math.floor(MAX_TRANSCRIPT_CHARS * 0.45));
  return `${head}\n\n[TRASCRIZIONE COMPATTATA: parte centrale omessa per limite contesto]\n\n${tail}`;
}

function episodeContext(input: GenerateEpisodeAIInput) {
  return [
    `Serie: ${input.serieTitle}`,
    `Episodio: ${input.episodeTitle ?? "Senza titolo"}`,
    `Stagione: ${input.season ?? "n/d"}`,
    `Numero episodio: ${input.episodeNumber ?? "n/d"}`,
    input.episodeLink ? `Link episodio: ${input.episodeLink}` : null
  ]
    .filter(Boolean)
    .join("\n");
}

function extractOutputText(response: unknown) {
  if (!response || typeof response !== "object") {
    return "";
  }

  const direct = (response as { output_text?: unknown }).output_text;
  if (typeof direct === "string") {
    return direct.trim();
  }

  const output = (response as { output?: unknown }).output;
  if (!Array.isArray(output)) {
    return "";
  }

  return output
    .flatMap((item) => {
      if (!item || typeof item !== "object") {
        return [];
      }

      const content = (item as { content?: unknown }).content;
      if (!Array.isArray(content)) {
        return [];
      }

      return content.map((part) => {
        if (!part || typeof part !== "object") {
          return "";
        }

        const text = (part as { text?: unknown }).text;
        return typeof text === "string" ? text : "";
      });
    })
    .join("\n")
    .trim();
}

async function createResponse(prompt: string, options: GenerateEpisodeAIOptions) {
  const { apiKey, model } = getOpenAIConfig();
  const body: Record<string, unknown> = {
    model,
    input: prompt,
    max_output_tokens: 1800
  };

  if (options.includeOnlineContext) {
    body.tools = [{ type: "web_search" }];
    body.tool_choice = "auto";
  }

  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload
        ? (payload as { error?: { message?: string } }).error?.message
        : null;
    throw new Error(message || `OpenAI API ha risposto con stato ${response.status}.`);
  }

  const text = extractOutputText(payload);

  if (!text) {
    throw new Error("OpenAI non ha restituito testo utilizzabile.");
  }

  return text;
}

export async function generateEpisodeSummary(input: GenerateEpisodeAIInput) {
  const transcript = compactTranscript(input.transcript);
  const prompt = `Sei un'assistente editoriale per una webapp di ricerca su serialita cinese.

Genera una SINTESI dell'episodio in italiano.
Puoi usare la trascrizione sotto e, se disponibile, il link dell'episodio o informazioni online per contestualizzare meglio nomi, trama e collocazione della puntata.
Non inventare fatti non supportati. Se il contenuto online non e utile, basati sulla trascrizione.
Scrivi 1-2 paragrafi chiari, massimo 180 parole.

${episodeContext(input)}

Trascrizione:
${transcript}`;

  try {
    return await createResponse(prompt, { includeOnlineContext: Boolean(input.episodeLink) });
  } catch (error) {
    if (!input.episodeLink) {
      throw error;
    }

    return createResponse(prompt, { includeOnlineContext: false });
  }
}

export async function generateEpisodeThematicEmotionalAnalysis(input: GenerateEpisodeAIInput) {
  const transcript = compactTranscript(input.transcript);
  const prompt = `Sei un'analista di contenuti televisivi in lingua cinese.

Genera una ANALISI TEMATICA ED EMOTIVA in italiano basandoti ESCLUSIVAMENTE sulla trascrizione fornita.
Non usare conoscenza esterna, web, titoli, recensioni o informazioni online per aggiungere fatti.
Evidenzia:
- temi narrativi principali;
- emozioni dominanti e secondarie;
- eventuali dinamiche tra personaggi;
- tono complessivo dell'episodio.
Scrivi in 1-2 paragrafi, massimo 220 parole.

${episodeContext({ ...input, episodeLink: null })}

Trascrizione:
${transcript}`;

  return createResponse(prompt, { includeOnlineContext: false });
}
