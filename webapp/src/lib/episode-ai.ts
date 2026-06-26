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
const OPENAI_PROVIDER = "openai";

const narrativeSignals = [
  {
    label: "indagine criminale",
    terms: ["案", "案件", "凶手", "杀手", "杀人", "连环", "尸体", "死亡", "证据", "嫌疑", "调查", "抓住", "逮捕"],
    sentence:
      "La puntata ruota attorno a un'indagine: i personaggi cercano di ricostruire un caso, interpretare gli indizi e arrivare all'identificazione del responsabile."
  },
  {
    label: "mistero e rivelazione",
    terms: ["秘密", "真相", "发现", "知道", "明白", "线索", "隐藏", "骗", "怀疑", "奇怪"],
    sentence:
      "La puntata costruisce un percorso di scoperta: una verita o un'informazione nascosta orienta le azioni dei personaggi e modifica la lettura degli eventi."
  },
  {
    label: "relazioni sentimentali",
    terms: ["爱", "喜欢", "女朋友", "男朋友", "结婚", "分手", "约会", "亲", "心", "想你"],
    sentence:
      "La puntata mette al centro una dinamica sentimentale, fatta di desideri, incomprensioni e tentativi di chiarire il rapporto tra i personaggi."
  },
  {
    label: "amicizia e convivenza",
    terms: ["朋友", "大家", "一起", "帮", "家", "房子", "邻居", "住", "公寓", "生活"],
    sentence:
      "La puntata segue la vita quotidiana del gruppo, con situazioni di convivenza, amicizia e piccoli conflitti che fanno avanzare le relazioni."
  },
  {
    label: "lavoro e responsabilita",
    terms: ["工作", "公司", "老板", "同事", "任务", "钱", "合同", "计划", "决定", "机会"],
    sentence:
      "La puntata si concentra su lavoro, responsabilita e decisioni pratiche, mostrando come i personaggi reagiscono a pressioni e obiettivi concreti."
  },
  {
    label: "conflitto personale",
    terms: ["吵架", "生气", "误会", "麻烦", "压力", "失败", "担心", "伤心", "选择", "改变"],
    sentence:
      "La puntata sviluppa un conflitto personale: tensioni, incomprensioni o scelte difficili spingono i personaggi a ridefinire le proprie posizioni."
  }
];

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

function shouldUseOpenAI() {
  return process.env.EPISODE_AI_PROVIDER === OPENAI_PROVIDER;
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

function formatList(items: string[]) {
  if (items.length === 0) {
    return "nessun elemento dominante";
  }

  if (items.length === 1) {
    return items[0];
  }

  return `${items.slice(0, -1).join(", ")} e ${items[items.length - 1]}`;
}

function getDominantNarrative(transcript: string) {
  return narrativeSignals
    .map((signal) => {
      const hits = signal.terms.reduce((total, term) => {
        const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return total + (transcript.match(new RegExp(escaped, "gu"))?.length ?? 0);
      }, 0);

      return { ...signal, hits };
    })
    .filter((signal) => signal.hits > 0)
    .sort((a, b) => b.hits - a.hits || a.label.localeCompare(b.label, "it"));
}

function generateLocalEpisodeSummary(input: GenerateEpisodeAIInput) {
  const narratives = getDominantNarrative(input.transcript);
  const narrativeLabel = narratives[0]?.label;
  const mainNarrative =
    narrativeLabel === "indagine criminale"
      ? "In questo episodio, i protagonisti si muovono dentro un caso da ricostruire: emergono indizi, sospetti e passaggi d'indagine che portano gradualmente verso la verita."
      : narrativeLabel === "relazioni sentimentali"
        ? "In questo episodio, la trama segue tensioni e desideri legati alle relazioni tra i personaggi, tra avvicinamenti, incomprensioni e scelte che cambiano gli equilibri affettivi."
        : narrativeLabel === "amicizia e convivenza"
          ? "In questo episodio, il racconto si concentra sulla vita condivisa dei personaggi, mostrando situazioni quotidiane, piccoli conflitti e momenti di solidarieta."
          : narrativeLabel === "lavoro e responsabilita"
            ? "In questo episodio, i personaggi affrontano decisioni pratiche e responsabilita concrete, mentre lavoro, obiettivi e pressioni esterne orientano lo sviluppo della puntata."
            : narrativeLabel === "mistero e rivelazione"
              ? "In questo episodio, una scoperta o un'informazione nascosta spinge i personaggi a rivedere cio che sanno, aprendo un percorso di chiarimento e rivelazione."
              : "In questo episodio, la storia segue gli snodi principali della puntata, mettendo in relazione azioni, scelte e reazioni dei personaggi.";
  const secondaryNarratives = narratives.slice(1, 3).map((signal) => signal.label);
  const secondaryText =
    secondaryNarratives.length > 0 ? ` La vicenda intreccia anche elementi di ${formatList(secondaryNarratives)}.` : "";

  return `${mainNarrative}${secondaryText}`;
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
  if (!shouldUseOpenAI()) {
    return generateLocalEpisodeSummary(input);
  }

  const transcript = compactTranscript(input.transcript);
  const prompt = `Sei un'assistente editoriale per una webapp di ricerca su serialita cinese.

Genera una SINTESI dell'episodio in italiano.
La sintesi deve essere una trama/sinossi dell'episodio, simile a una descrizione editoriale: cosa succede, quale situazione apre la puntata, quale conflitto o evento si sviluppa, e qual e il nucleo narrativo.
Non citare analisi lessicali, parole ricorrenti, frequenze, token, n-grammi o metodologia di analisi.
Non scrivere "la trascrizione mostra", "i segnali indicano" o formule analitiche.
Puoi usare la trascrizione sotto e ricerche su fonti online verificate per contestualizzare meglio nomi, trama e collocazione della puntata.
Considera fonti verificate: pagine ufficiali, piattaforme streaming, broadcaster, enciclopedie affidabili, database editoriali riconoscibili o articoli firmati. Evita forum, commenti casuali, riassunti non attribuiti e contenuti generati automaticamente.
Se le fonti online sono in conflitto con la trascrizione, dai priorita alla trascrizione dell'episodio.
Non inventare fatti non supportati. Se il contenuto online non e utile, basati sulla trascrizione.
Scrivi un solo paragrafo chiaro, massimo 120 parole, nello stile di una trama breve.
Non inserire citazioni finali.

${episodeContext(input)}

Trascrizione:
${transcript}`;

  try {
    return await createResponse(prompt, { includeOnlineContext: true });
  } catch (error) {
    return createResponse(prompt, { includeOnlineContext: false });
  }
}
