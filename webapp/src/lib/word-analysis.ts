export type WordStat = {
  parola: string;
  conteggio: number;
  percentuale: number;
};

export type TranscriptAnalysis = {
  totaleToken: number;
  tokenUnici: number;
  topParole: WordStat[];
  parolaTarget: string | null;
  occorrenzeTarget: number | null;
  densitaTarget: number | null;
  posizioniTarget: number[];
  note: string;
};

const stopwords = new Set([
  "的",
  "了",
  "是",
  "我",
  "你",
  "他",
  "她",
  "它",
  "们",
  "在",
  "就",
  "都",
  "和",
  "也",
  "很",
  "不",
  "有",
  "吗",
  "啊",
  "吧",
  "呢",
  "the",
  "and",
  "for",
  "con",
  "che",
  "del",
  "della",
  "dei",
  "gli",
  "le",
  "un",
  "una",
  "per"
]);

function normalizeToken(token: string) {
  return token.trim().toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
}

export function tokenizeTranscript(text: string) {
  const segmenter = new Intl.Segmenter("zh", { granularity: "word" });
  const tokens: string[] = [];

  for (const segment of segmenter.segment(text)) {
    if (!segment.isWordLike) {
      continue;
    }

    const token = normalizeToken(segment.segment);

    if (!token || stopwords.has(token)) {
      continue;
    }

    tokens.push(token);
  }

  return tokens;
}

export function analyzeTranscript(text: string, targetWord?: string | null): TranscriptAnalysis {
  const tokens = tokenizeTranscript(text);
  const counts = new Map<string, number>();
  const normalizedTarget = targetWord ? normalizeToken(targetWord) : "";
  const posizioniTarget: number[] = [];

  tokens.forEach((token, index) => {
    counts.set(token, (counts.get(token) ?? 0) + 1);

    if (normalizedTarget && token === normalizedTarget) {
      posizioniTarget.push(index + 1);
    }
  });

  const topParole = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh"))
    .slice(0, 50)
    .map(([parola, conteggio]) => ({
      parola,
      conteggio,
      percentuale: tokens.length > 0 ? Number(((conteggio / tokens.length) * 100).toFixed(2)) : 0
    }));

  const occorrenzeTarget = normalizedTarget ? counts.get(normalizedTarget) ?? 0 : null;
  const densitaTarget =
    normalizedTarget && tokens.length > 0 && occorrenzeTarget !== null
      ? Number(((occorrenzeTarget / tokens.length) * 100).toFixed(2))
      : null;

  return {
    totaleToken: tokens.length,
    tokenUnici: counts.size,
    topParole,
    parolaTarget: normalizedTarget || null,
    occorrenzeTarget,
    densitaTarget,
    posizioniTarget: posizioniTarget.slice(0, 100),
    note:
      "Analisi calcolata con segmentazione lessicale automatica e stopword comuni. Utile per frequenze, ricorrenze e confronto tra episodi."
  };
}
