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

export type CharacterInput = {
  id?: string;
  nome_originale: string;
  nome_italiano?: string | null;
  nome_pinyin?: string | null;
};

export type CharacterLexicalStat = {
  personaggio: string;
  menzioni: number;
  parole_caratterizzanti: WordStat[];
  combinazioni_caratterizzanti: PhraseStat[];
  contesti: string[];
  metodo: "speaker" | "menzione";
};

export type TranscriptAnalysis = {
  totaleToken: number;
  tokenUnici: number;
  topParole: WordStat[];
  topCombinazioni: PhraseStat[];
  personaggi: CharacterLexicalStat[];
  modiDiDire: PhraseStat[];
  riferimenti: WordStat[];
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
  "人",
  "家",
  "心",
  "情",
  "事",
  "事儿",
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
  "觉得",
  "认为",
  "以为",
  "记得",
  "明白",
  "懂",
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
  "做",
  "干",
  "用",
  "拿",
  "找",
  "问",
  "听",
  "吃",
  "喝",
  "走",
  "坐",
  "站",
  "叫",
  "告诉",
  "起来",
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

const referenceStopwords = new Set(["老师", "东西", "事情", "问题", "地方", "时候", "大家", "自己", "今天", "现在"]);

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

function getTopEntries(counts: Map<string, number>, total: number, limit: number, minCount = 1) {
  return [...counts.entries()]
    .filter(([, count]) => count >= minCount)
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

function splitLines(text: string) {
  return text
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);
}

function sentenceLikeChunks(text: string) {
  return text
    .replace(/\s+/g, "\n")
    .split(/(?<=[。！？!?])|\n+/u)
    .map((line) => line.trim())
    .filter((line) => line.length >= 4 && line.length <= 160);
}

function extractSpeakerLines(text: string) {
  return splitLines(text)
    .map((line) => {
      const match = line.match(/^([\p{Script=Han}A-Za-z0-9·]{1,10})[：:]\s*(.+)$/u);

      if (!match) {
        return null;
      }

      return {
        speaker: match[1],
        text: match[2]
      };
    })
    .filter((line): line is { speaker: string; text: string } => Boolean(line));
}

function characterAliases(character: CharacterInput) {
  return [character.nome_originale, character.nome_italiano, character.nome_pinyin]
    .filter((value): value is string => Boolean(value?.trim()))
    .map((value) => value.trim());
}

function getCharacterContexts(text: string, aliases: string[]) {
  const chunks = sentenceLikeChunks(text);
  const contexts: string[] = [];
  let mentions = 0;

  for (const chunk of chunks) {
    if (aliases.some((alias) => alias && chunk.includes(alias))) {
      mentions += 1;
      contexts.push(chunk);
    }
  }

  return {
    mentions,
    contexts: contexts.slice(0, 8)
  };
}

function analyzeCharacterContext(character: CharacterInput, fullText: string, speakerLines: ReturnType<typeof extractSpeakerLines>) {
  const aliases = characterAliases(character);
  const speakerMatches = speakerLines.filter((line) => aliases.includes(line.speaker));
  const contextText =
    speakerMatches.length > 0
      ? speakerMatches.map((line) => line.text).join("\n")
      : getCharacterContexts(fullText, aliases).contexts.join("\n");
  const mentionData = getCharacterContexts(fullText, aliases);
  const tokens = tokenizeTranscript(contextText);
  const counts = new Map<string, number>();

  for (const token of tokens) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }

  return {
    personaggio: character.nome_originale,
    menzioni: speakerMatches.length > 0 ? speakerMatches.length : mentionData.mentions,
    parole_caratterizzanti: getTopEntries(counts, Math.max(tokens.length, 1), 12, 2),
    combinazioni_caratterizzanti: buildNgrams(tokens).slice(0, 8),
    contesti: speakerMatches.length > 0 ? speakerMatches.slice(0, 8).map((line) => line.text) : mentionData.contexts,
    metodo: speakerMatches.length > 0 ? "speaker" : "menzione"
  } satisfies CharacterLexicalStat;
}

function extractCharacterStats(text: string, characters: CharacterInput[] = []) {
  const speakerLines = extractSpeakerLines(text);

  return characters
    .map((character) => analyzeCharacterContext(character, text, speakerLines))
    .filter((character) => character.menzioni > 0)
    .sort((a, b) => b.menzioni - a.menzioni || a.personaggio.localeCompare(b.personaggio, "zh"))
    .slice(0, 20);
}

function extractIdiomsAndExpressions(topCombinazioni: PhraseStat[]) {
  return topCombinazioni
    .filter((phrase) => {
      const compact = phrase.frase.replace(/\s+/g, "");
      const looksLikeIdiom = /^[\p{Script=Han}]{4,8}$/u.test(compact);
      const hasSpecificity = phrase.frase.split(/\s+/u).some((token) => token.length >= 2 && !stopwords.has(token));

      return phrase.conteggio >= 2 && hasSpecificity && (looksLikeIdiom || phrase.lunghezza >= 3);
    })
    .slice(0, 20);
}

function extractReferences(text: string) {
  const quoted = [...text.matchAll(/[“《(（]([^”》)）]{2,14})[”》)）]/gu)].map((match) => match[1]);
  const candidates = new Map<string, number>();

  for (const value of quoted) {
    const token = normalizeToken(value);

    if (token && !referenceStopwords.has(token)) {
      candidates.set(token, (candidates.get(token) ?? 0) + 1);
    }
  }

  for (const chunk of sentenceLikeChunks(text)) {
    for (const match of chunk.matchAll(/[\p{Script=Han}]{3,8}/gu)) {
      const token = match[0];

      if (!referenceStopwords.has(token) && !stopwords.has(token)) {
        candidates.set(token, (candidates.get(token) ?? 0) + 1);
      }
    }
  }

  return getTopEntries(candidates, [...candidates.values()].reduce((sum, count) => sum + count, 0), 20, 2);
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

export function analyzeTranscript(
  text: string,
  targetWord?: string | null,
  targetPhrase?: string | null,
  options: { personaggi?: CharacterInput[] } = {}
): TranscriptAnalysis {
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
  const personaggi = extractCharacterStats(text, options.personaggi);
  const modiDiDire = extractIdiomsAndExpressions(topCombinazioni);
  const riferimenti = extractReferences(text);
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
    personaggi,
    modiDiDire,
    riferimenti,
    parolaTarget: normalizedTarget || null,
    occorrenzeTarget,
    densitaTarget,
    fraseTarget: normalizedPhrase || null,
    occorrenzeFraseTarget: normalizedPhrase ? countPhraseOccurrences(tokens, normalizedPhrase) : null,
    posizioniTarget: posizioniTarget.slice(0, 100),
    note:
      "Analisi calcolata con segmentazione lessicale automatica, filtro stopword esteso, contesti personaggio, modi di dire e riferimenti ricorrenti."
  };
}
