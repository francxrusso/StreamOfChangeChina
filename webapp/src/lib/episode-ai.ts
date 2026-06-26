import { analyzeTranscript, type CharacterInput } from "@/lib/word-analysis";

type GenerateEpisodeAIInput = {
  serieTitle: string;
  episodeTitle: string | null;
  season: number | null;
  episodeNumber: number | null;
  transcript: string;
  episodeLink: string | null;
  characters?: CharacterInput[];
};

type GenerateEpisodeAIOptions = {
  includeOnlineContext: boolean;
};

type LocalSignal = {
  label: string;
  terms: string[];
};

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_OPENAI_MODEL = "gpt-5.4-mini";
const MAX_TRANSCRIPT_CHARS = 65000;
const OPENAI_PROVIDER = "openai";

const themeSignals: LocalSignal[] = [
  { label: "relazioni e legami", terms: ["爱", "喜欢", "朋友", "女朋友", "男朋友", "结婚", "家庭", "家人", "关系"] },
  { label: "conflitto e tensione", terms: ["吵架", "生气", "问题", "麻烦", "误会", "失败", "危险", "压力", "担心"] },
  { label: "lavoro e vita quotidiana", terms: ["工作", "公司", "老板", "同事", "钱", "房子", "生活", "计划", "事情"] },
  { label: "indagine e verita", terms: ["案", "案件", "真相", "证据", "警察", "调查", "嫌疑", "尸体", "死亡"] },
  { label: "cambiamento personale", terms: ["梦想", "决定", "改变", "未来", "成长", "选择", "机会", "希望"] }
];

const emotionSignals: LocalSignal[] = [
  { label: "gioia", terms: ["开心", "高兴", "快乐", "笑", "幸福", "喜欢", "好玩"] },
  { label: "tristezza", terms: ["难过", "伤心", "哭", "痛苦", "失望", "孤独", "可怜"] },
  { label: "rabbia", terms: ["生气", "愤怒", "讨厌", "烦", "气死", "骂", "吵"] },
  { label: "paura e ansia", terms: ["害怕", "担心", "紧张", "危险", "怕", "恐怖", "压力"] },
  { label: "sorpresa", terms: ["惊讶", "突然", "没想到", "奇怪", "真的", "竟然"] },
  { label: "amore e affetto", terms: ["爱", "喜欢", "亲", "抱", "想你", "心", "温柔"] }
];

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

function countSignalTerms(transcript: string, signals: LocalSignal[]) {
  return signals
    .map((signal) => {
      const hits = signal.terms.reduce((total, term) => {
        const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return total + (transcript.match(new RegExp(escaped, "gu"))?.length ?? 0);
      }, 0);

      return { label: signal.label, hits };
    })
    .filter((signal) => signal.hits > 0)
    .sort((a, b) => b.hits - a.hits || a.label.localeCompare(b.label, "it"))
    .slice(0, 4);
}

function splitTranscriptSentences(transcript: string) {
  return transcript
    .replace(/\[[^\]]+\]/g, " ")
    .replace(/\s+/g, " ")
    .split(/(?<=[。！？!?])|[\r\n]+/u)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 8 && sentence.length <= 180)
    .filter((sentence, index, sentences) => sentences.indexOf(sentence) === index)
    .slice(0, 600);
}

function getSalientSentences(transcript: string, topWords: string[]) {
  const sentences = splitTranscriptSentences(transcript);
  const weights = new Map(topWords.map((word, index) => [word, Math.max(1, topWords.length - index)]));

  return sentences
    .map((sentence, index) => {
      const score = topWords.reduce((total, word) => {
        if (!word || !sentence.includes(word)) {
          return total;
        }

        return total + (weights.get(word) ?? 1);
      }, 0);

      return { sentence, index, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, 4)
    .sort((a, b) => a.index - b.index)
    .map((item) => item.sentence);
}

function cleanQuote(sentence: string) {
  return sentence
    .replace(/^[-–—\s]+/u, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 140);
}

function pickEpisodeQuote(transcript: string, salientSentences: string[]) {
  const quote =
    salientSentences.find((sentence) => sentence.length >= 10 && sentence.length <= 140) ??
    splitTranscriptSentences(transcript).find((sentence) => sentence.length >= 10 && sentence.length <= 140) ??
    "";

  return cleanQuote(quote);
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

function formatSignals(signals: { label: string; hits: number }[]) {
  if (signals.length === 0) {
    return "non emergono indicatori lessicali dominanti";
  }

  return signals.map((signal) => `${signal.label} (${signal.hits})`).join(", ");
}

function formatCharacterInsights(characters: ReturnType<typeof analyzeTranscript>["personaggi"]) {
  if (characters.length === 0) {
    return "La trascrizione non contiene marcatori sufficienti per associare lessico ricorrente a singoli personaggi.";
  }

  return characters
    .slice(0, 5)
    .map((character) => {
      const words = character.parole_caratterizzanti.slice(0, 4).map((word) => word.parola);
      const phrases = character.combinazioni_caratterizzanti.slice(0, 2).map((phrase) => phrase.frase.replace(/\s+/g, ""));
      const details = [...words, ...phrases].filter(Boolean);

      return `${character.personaggio}: ${details.length > 0 ? formatList(details) : "contesto presente ma senza formule ricorrenti forti"}`;
    })
    .join("; ");
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

function getLocalAnalysis(input: GenerateEpisodeAIInput) {
  const analysis = analyzeTranscript(input.transcript, null, null, { personaggi: input.characters ?? [] });
  const topWords = analysis.topParole.slice(0, 10).map((item) => item.parola);
  const topPhrases = analysis.topCombinazioni.slice(0, 5).map((item) => item.frase.replace(/\s+/g, ""));
  const salientSentences = getSalientSentences(input.transcript, topWords);
  const themes = countSignalTerms(input.transcript, themeSignals);
  const emotions = countSignalTerms(input.transcript, emotionSignals);
  const narratives = getDominantNarrative(input.transcript);

  return {
    analysis,
    topWords,
    topPhrases,
    salientSentences,
    themes,
    emotions,
    narratives
  };
}

function generateLocalEpisodeSummary(input: GenerateEpisodeAIInput) {
  const { narratives } = getLocalAnalysis(input);
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

function generateLocalEpisodeThemeAnalysis(input: GenerateEpisodeAIInput) {
  const { analysis, themes } = getLocalAnalysis(input);
  const characterText = formatCharacterInsights(analysis.personaggi);
  const topWordsText = analysis.topParole.length > 0
    ? ` Parole chiave ricorrenti: ${formatList(analysis.topParole.slice(0, 8).map((word) => word.parola))}.`
    : "";
  const idiomText =
    analysis.modiDiDire.length > 0
      ? ` Modi di dire o formule ricorrenti: ${formatList(analysis.modiDiDire.slice(0, 6).map((phrase) => phrase.frase.replace(/\s+/g, "")))}.`
      : "";
  const referenceText =
    analysis.riferimenti.length > 0
      ? ` Riferimenti ricorrenti: ${formatList(analysis.riferimenti.slice(0, 6).map((reference) => reference.parola))}.`
      : "";

  return `I temi piu riconoscibili dai segnali lessicali sono: ${formatSignals(themes)}.${topWordsText} Associazioni personaggio-lessico: ${characterText}.${idiomText}${referenceText} Totale analizzato: ${analysis.totaleToken} parole significative, ${analysis.tokenUnici} parole uniche.`;
}

function generateLocalEpisodeEmotionAnalysis(input: GenerateEpisodeAIInput) {
  const { emotions } = getLocalAnalysis(input);

  return `Le emozioni piu riconoscibili dai segnali testuali sono: ${formatSignals(emotions)}. Questa lettura si basa esclusivamente sugli indicatori presenti nella trascrizione e distingue la componente emotiva dalla trama e dall'analisi lessicale.`;
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
Puoi usare la trascrizione sotto e, se disponibile, il link dell'episodio o informazioni online per contestualizzare meglio nomi, trama e collocazione della puntata.
Non inventare fatti non supportati. Se il contenuto online non e utile, basati sulla trascrizione.
Scrivi un solo paragrafo chiaro, massimo 120 parole, nello stile di una trama breve.
Non inserire citazioni finali.

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

export async function generateEpisodeThemeAnalysis(input: GenerateEpisodeAIInput) {
  if (!shouldUseOpenAI()) {
    return generateLocalEpisodeThemeAnalysis(input);
  }

  const transcript = compactTranscript(input.transcript);
  const prompt = `Sei un'analista di contenuti televisivi in lingua cinese.

Genera una ANALISI TEMATICA PER PAROLE in italiano basandoti ESCLUSIVAMENTE sulla trascrizione fornita.
Non usare conoscenza esterna, web, titoli, recensioni o informazioni online per aggiungere fatti.
Evidenzia:
- temi ricorrenti riconoscibili dal lessico;
- parole, formule, modi di dire o riferimenti che tornano;
- se possibile, quali personaggi sembrano associati a quali parole o espressioni.
Non parlare di emozioni: quelle verranno generate in una sezione separata.
Scrivi in 1-2 paragrafi, massimo 220 parole.

${episodeContext({ ...input, episodeLink: null })}

Trascrizione:
${transcript}`;

  return createResponse(prompt, { includeOnlineContext: false });
}

export async function generateEpisodeEmotionAnalysis(input: GenerateEpisodeAIInput) {
  if (!shouldUseOpenAI()) {
    return generateLocalEpisodeEmotionAnalysis(input);
  }

  const transcript = compactTranscript(input.transcript);
  const prompt = `Sei un'analista emotiva di contenuti televisivi in lingua cinese.

Genera una ANALISI DELLE EMOZIONI in italiano basandoti ESCLUSIVAMENTE sulla trascrizione fornita.
Non usare conoscenza esterna, web, titoli, recensioni o informazioni online per aggiungere fatti.
Concentrati solo su:
- emozioni dominanti e secondarie;
- passaggi emotivi o cambi di tono;
- eventuali tensioni affettive percepibili dal testo.
Non fare analisi lessicale generale e non riassumere la trama.
Scrivi in 1 paragrafo, massimo 170 parole.

${episodeContext({ ...input, episodeLink: null })}

Trascrizione:
${transcript}`;

  return createResponse(prompt, { includeOnlineContext: false });
}
