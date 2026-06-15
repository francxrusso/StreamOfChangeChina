export type WordStat = {
  parola: string;
  conteggio: number;
  percentuale: number;
};

export type PhraseStat = {
  frase: string;
  conteggio: number;
  lunghezza: number;
  tipo: "bigramma" | "trigramma" | "quadrigramma";
};

export type TranscriptAnalysis = {
  totaleToken: number;
  tokenUnici: number;
  topParole: WordStat[];
  topCombinazioni: PhraseStat[];
  parolaTarget: string | null;
  occorrenzeTarget: number | null;
  densitaTarget: number | null;
  fraseTarget: string | null;
  occorrenzeFraseTarget: number | null;
  posizioniTarget: number[];
  note: string;
};

const stopwords = new Set([
  "、",
  "。",
  "！",
  "？",
  "的",
  "了",
  "是",
  "我",
  "你",
  "他",
  "她",
  "它",
  "们",
  "您",
  "谁",
  "哪",
  "哪儿",
  "哪里",
  "这",
  "那",
  "这个",
  "那个",
  "这里",
  "那里",
  "这些",
  "那些",
  "这种",
  "那种",
  "一个",
  "什么",
  "怎么",
  "这样",
  "这么",
  "时候",
  "就是",
  "还是",
  "没有",
  "不是",
  "可以",
  "知道",
  "现在",
  "然后",
  "因为",
  "所以",
  "如果",
  "但是",
  "已经",
  "自己",
  "别人",
  "大家",
  "我们",
  "你们",
  "他们",
  "她们",
  "在",
  "就",
  "都",
  "和",
  "跟",
  "跟着",
  "或",
  "或者",
  "以及",
  "并且",
  "也",
  "很",
  "不",
  "有",
  "有点",
  "一点",
  "一下",
  "要",
  "去",
  "来",
  "把",
  "被",
  "到",
  "给",
  "说",
  "看",
  "想",
  "让",
  "能",
  "会",
  "还",
  "没",
  "别",
  "再",
  "才",
  "又",
  "只",
  "只要",
  "只有",
  "应该",
  "可能",
  "一定",
  "真的",
  "其实",
  "当然",
  "反正",
  "不过",
  "可是",
  "而且",
  "或者",
  "于是",
  "那么",
  "那么",
  "一下",
  "一些",
  "一样",
  "一切",
  "一点儿",
  "起来",
  "出来",
  "进去",
  "回来",
  "下来",
  "上去",
  "过来",
  "过去",
  "东西",
  "地方",
  "事情",
  "问题",
  "个人",
  "一次",
  "两个",
  "一种",
  "那个",
  "这个",
  "哪个",
  "个",
  "只",
  "条",
  "张",
  "件",
  "本",
  "次",
  "位",
  "些",
  "种",
  "点",
  "份",
  "辆",
  "把",
  "双",
  "间",
  "所",
  "台",
  "吗",
  "嘛",
  "啦",
  "呀",
  "喂",
  "嗯",
  "哦",
  "哎",
  "吗",
  "啊",
  "吧",
  "呢",
  "this",
  "that",
  "with",
  "from",
  "are",
  "was",
  "were",
  "you",
  "your",
  "his",
  "her",
  "not",
  "but",
  "have",
  "has",
  "had",
  "all",
  "can",
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

const meaningfulSingleHan = new Set([
  "爱",
  "家",
  "钱",
  "心",
  "人",
  "案",
  "血",
  "罪",
  "法",
  "命",
  "梦",
  "病",
  "药",
  "尸",
  "死",
  "生",
  "情",
  "光",
  "渊"
]);

function normalizeToken(token: string) {
  return token.trim().toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
}

function isMeaningfulToken(token: string) {
  if (!token || stopwords.has(token)) {
    return false;
  }

  if (/^\d+$/u.test(token)) {
    return false;
  }

  if (/^[a-z]$/u.test(token)) {
    return false;
  }

  if (/^[\p{Script=Han}]$/u.test(token) && !meaningfulSingleHan.has(token)) {
    return false;
  }

  if (/^[\p{Script=Han}]{2,}$/u.test(token) && [...token].every((char) => stopwords.has(char))) {
    return false;
  }

  return true;
}

export function tokenizeTranscript(text: string, options: { keepStopwords?: boolean } = {}) {
  const segmenter = new Intl.Segmenter("zh", { granularity: "word" });
  const tokens: string[] = [];

  for (const segment of segmenter.segment(text)) {
    if (!segment.isWordLike) {
      continue;
    }

    const token = normalizeToken(segment.segment);

    if (options.keepStopwords ? !token : !isMeaningfulToken(token)) {
      continue;
    }

    tokens.push(token);
  }

  return tokens;
}

function getTopEntries(counts: Map<string, number>, total: number, limit: number) {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh"))
    .slice(0, limit)
    .map(([parola, conteggio]) => ({
      parola,
      conteggio,
      percentuale: total > 0 ? Number(((conteggio / total) * 100).toFixed(2)) : 0
    }));
}

function buildNgrams(tokens: string[], sizes = [2, 3, 4]): PhraseStat[] {
  const counts = new Map<string, { conteggio: number; lunghezza: number }>();

  for (const size of sizes) {
    for (let index = 0; index <= tokens.length - size; index += 1) {
      const ngramTokens = tokens.slice(index, index + size);

      if (new Set(ngramTokens).size === 1) {
        continue;
      }

      const phrase = ngramTokens.join(" ");
      const current = counts.get(phrase);
      counts.set(phrase, {
        conteggio: (current?.conteggio ?? 0) + 1,
        lunghezza: size
      });
    }
  }

  return [...counts.entries()]
    .filter(([, value]) => value.conteggio >= 2)
    .sort((a, b) => b[1].conteggio - a[1].conteggio || b[1].lunghezza - a[1].lunghezza || a[0].localeCompare(b[0], "zh"))
    .slice(0, 50)
    .map(([frase, value]) => ({
      frase,
      conteggio: value.conteggio,
      lunghezza: value.lunghezza,
      tipo: value.lunghezza === 2 ? "bigramma" : value.lunghezza === 3 ? "trigramma" : "quadrigramma"
    }));
}

function normalizePhrase(phrase: string) {
  return tokenizeTranscript(phrase).join(" ");
}

function countPhraseOccurrences(tokens: string[], phrase: string) {
  const phraseTokens = phrase.split(" ").filter(Boolean);

  if (phraseTokens.length === 0) {
    return null;
  }

  let count = 0;

  for (let index = 0; index <= tokens.length - phraseTokens.length; index += 1) {
    const matches = phraseTokens.every((token, tokenIndex) => tokens[index + tokenIndex] === token);

    if (matches) {
      count += 1;
    }
  }

  return count;
}

export function analyzeTranscript(text: string, targetWord?: string | null, targetPhrase?: string | null): TranscriptAnalysis {
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

  const topParole = getTopEntries(counts, tokens.length, 50);
  const topCombinazioni = buildNgrams(tokens);
  const normalizedPhrase = targetPhrase ? normalizePhrase(targetPhrase) : "";

  const occorrenzeTarget = normalizedTarget ? counts.get(normalizedTarget) ?? 0 : null;
  const densitaTarget =
    normalizedTarget && tokens.length > 0 && occorrenzeTarget !== null
      ? Number(((occorrenzeTarget / tokens.length) * 100).toFixed(2))
      : null;

  return {
    totaleToken: tokens.length,
    tokenUnici: counts.size,
    topParole,
    topCombinazioni,
    parolaTarget: normalizedTarget || null,
    occorrenzeTarget,
    densitaTarget,
    fraseTarget: normalizedPhrase || null,
    occorrenzeFraseTarget: normalizedPhrase ? countPhraseOccurrences(tokens, normalizedPhrase) : null,
    posizioniTarget: posizioniTarget.slice(0, 100),
    note:
      "Analisi calcolata con segmentazione lessicale automatica, filtro stopword e n-grammi ricorrenti. Utile per frequenze, combinazioni lessicali e confronto tra episodi."
  };
}
