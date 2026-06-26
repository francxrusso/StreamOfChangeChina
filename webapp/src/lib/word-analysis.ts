import { generatePinyin } from "@/lib/pinyin";

export type WordStat = {
  parola: string;
  conteggio: number;
  percentuale: number;
  pinyin?: string | null;
};

export type PhraseStat = {
  frase: string;
  conteggio: number;
  lunghezza: number;
  tipo: "bigramma" | "trigramma" | "quadrigramma" | "formula" | "chengyu";
  pinyin?: string | null;
};

export type ConstructionStat = {
  costrutto: string;
  tipo: "pattern" | "formula" | "chengyu";
  conteggio: number;
  esempi: string[];
  pinyin?: string | null;
};

export type TargetStat = {
  valore: string;
  normalizzato: string;
  tipo: "parola" | "frase";
  conteggio: number;
  densita: number;
  posizioni: number[];
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
  costruttiRicorrenti: ConstructionStat[];
  target: TargetStat[];
  parolaTarget: string | null;
  occorrenzeTarget: number | null;
  densitaTarget: number | null;
  fraseTarget: string | null;
  occorrenzeFraseTarget: number | null;
  posizioniTarget: number[];
  note: string;
};

const hanRegex = /\p{Script=Han}/u;
const onlyHanRegex = /^[\p{Script=Han}]+$/u;

const stopwords = new Set([
  "的",
  "了",
  "着",
  "过",
  "地",
  "得",
  "是",
  "不是",
  "我是",
  "你是",
  "他是",
  "她是",
  "在",
  "有",
  "没有",
  "没",
  "不",
  "别",
  "会",
  "能",
  "要",
  "想",
  "说",
  "看",
  "听",
  "问",
  "做",
  "来",
  "去",
  "把",
  "被",
  "给",
  "让",
  "和",
  "跟",
  "与",
  "及",
  "或",
  "但",
  "也",
  "都",
  "就",
  "还",
  "再",
  "又",
  "才",
  "只",
  "很",
  "太",
  "真",
  "真的",
  "其实",
  "当然",
  "可能",
  "应该",
  "一定",
  "已经",
  "现在",
  "然后",
  "因为",
  "所以",
  "如果",
  "但是",
  "可是",
  "不过",
  "而且",
  "或者",
  "那么",
  "这样",
  "这么",
  "那样",
  "怎么",
  "什么",
  "为什么",
  "哪里",
  "哪儿",
  "谁",
  "我",
  "你",
  "他",
  "她",
  "它",
  "我们",
  "你们",
  "他们",
  "她们",
  "自己",
  "大家",
  "别人",
  "人",
  "个人",
  "一个",
  "两个",
  "这个",
  "那个",
  "这些",
  "那些",
  "这里",
  "那里",
  "一种",
  "一样",
  "一些",
  "一点",
  "一下",
  "事情",
  "东西",
  "地方",
  "时候",
  "问题",
  "今天",
  "明天",
  "昨天",
  "吗",
  "嘛",
  "呢",
  "吧",
  "啊",
  "呀",
  "啦",
  "喂",
  "嗯",
  "哦",
  "哎",
  "诶",
  "the",
  "and",
  "for",
  "with",
  "from",
  "this",
  "that",
  "che",
  "con",
  "per",
  "del",
  "della"
]);

const meaningfulSingleHan = new Set([
  "爱",
  "钱",
  "家",
  "案",
  "罪",
  "血",
  "命",
  "梦",
  "药",
  "病",
  "尸",
  "死",
  "光",
  "渊"
]);

const domainTerms = [
  "案件",
  "案发",
  "案发现场",
  "现场",
  "证据",
  "嫌疑人",
  "凶手",
  "杀手",
  "杀人",
  "连环杀手",
  "尸体",
  "死亡",
  "犯罪",
  "真相",
  "秘密",
  "警察",
  "巡查队",
  "署长",
  "共情者",
  "零度共情者",
  "公寓",
  "朋友",
  "女朋友",
  "男朋友",
  "结婚",
  "分手",
  "工作",
  "老板",
  "合同",
  "公司"
];

const structuralMarkers = new Set([
  "因为",
  "所以",
  "如果",
  "就",
  "虽然",
  "但是",
  "不过",
  "不但",
  "而且",
  "不是",
  "就是",
  "只要",
  "只有",
  "才",
  "连",
  "都",
  "越",
  "越",
  "一边",
  "一边",
  "先",
  "再",
  "把",
  "被",
  "对",
  "向",
  "给"
]);

const knownIdioms = new Set([
  "莫名其妙",
  "不可思议",
  "一模一样",
  "乱七八糟",
  "自言自语",
  "理所当然",
  "无论如何",
  "毫无关系",
  "一言为定",
  "半信半疑",
  "心甘情愿",
  "走投无路",
  "目瞪口呆",
  "大惊小怪",
  "不知所措",
  "阴差阳错",
  "千真万确",
  "胡说八道",
  "不可告人",
  "若无其事"
]);

const grammarPatterns: Array<{ label: string; regex: RegExp }> = [
  { label: "因为...所以...", regex: /因为[^。！？\n]{0,40}?所以/gu },
  { label: "如果...就...", regex: /如果[^。！？\n]{0,40}?就/gu },
  { label: "虽然...但是/不过...", regex: /虽然[^。！？\n]{0,50}?(?:但是|不过)/gu },
  { label: "不但...而且...", regex: /不但[^。！？\n]{0,40}?而且/gu },
  { label: "不是...就是...", regex: /不是[^。！？\n]{0,30}?就是/gu },
  { label: "只要...就...", regex: /只要[^。！？\n]{0,40}?就/gu },
  { label: "只有...才...", regex: /只有[^。！？\n]{0,40}?才/gu },
  { label: "连...都/也...", regex: /连[^。！？\n]{0,28}?(?:都|也)/gu },
  { label: "越...越...", regex: /越[^。！？\n]{0,12}?越/gu },
  { label: "一边...一边...", regex: /一边[^。！？\n]{0,30}?一边/gu },
  { label: "先...再...", regex: /先[^。！？\n]{0,30}?再/gu },
  { label: "把字句", regex: /把[\p{Script=Han}A-Za-z0-9]{1,12}[^。！？\n]{0,32}/gu },
  { label: "被字句", regex: /被[\p{Script=Han}A-Za-z0-9]{1,12}[^。！？\n]{0,32}/gu }
];

function stripTranscriptMarkup(text: string) {
  return text
    .replace(/https?:\/\/\S+/giu, " ")
    .replace(/\b\d{1,2}:\d{2}(?::\d{2})?\b/gu, " ")
    .replace(/\[[^\]]{1,40}\]/gu, " ")
    .replace(/^([\p{Script=Han}A-Za-z0-9·_\-\s]{1,18})[：:]/gmu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeToken(token: string) {
  return token
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
}

function compactHan(value: string) {
  return value.replace(/[^\p{Script=Han}A-Za-z0-9]+/gu, "");
}

function withPinyin<T extends { parola?: string; frase?: string }>(item: T) {
  const value = "parola" in item ? item.parola : item.frase;
  return {
    ...item,
    pinyin: value && hanRegex.test(value) ? generatePinyin(value) : null
  };
}

function isMeaningfulToken(token: string) {
  if (!token || stopwords.has(token)) {
    return false;
  }

  if (/^\d+$/u.test(token) || /^[a-z]$/u.test(token)) {
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
  const source = stripTranscriptMarkup(text);
  const segmenter = new Intl.Segmenter("zh-Hans", { granularity: "word" });
  const tokens: string[] = [];

  for (const segment of segmenter.segment(source)) {
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

function countDomainTerms(text: string) {
  const source = stripTranscriptMarkup(text);
  const counts = new Map<string, number>();

  for (const term of domainTerms) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const count = source.match(new RegExp(escaped, "gu"))?.length ?? 0;

    if (count > 0) {
      counts.set(term, count);
    }
  }

  return counts;
}

function getTopEntries(counts: Map<string, number>, total: number, limit: number, minCount = 1) {
  return [...counts.entries()]
    .filter(([, count]) => count >= minCount)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-Hans"))
    .slice(0, limit)
    .map(([parola, conteggio]) =>
      withPinyin({
        parola,
        conteggio,
        percentuale: total > 0 ? Number(((conteggio / total) * 100).toFixed(2)) : 0
      })
    );
}

function hasUsefulNgramTokens(tokens: string[]) {
  const useful = tokens.filter((token) => isMeaningfulToken(token));

  if (useful.length === 0) {
    return false;
  }

  if (useful.length === 1 && useful[0].length === 1 && !meaningfulSingleHan.has(useful[0])) {
    return false;
  }

  return true;
}

function buildNgrams(tokens: string[], sizes = [2, 3, 4], minCount = 2): PhraseStat[] {
  const counts = new Map<string, { conteggio: number; lunghezza: number }>();

  for (const size of sizes) {
    for (let index = 0; index <= tokens.length - size; index += 1) {
      const ngramTokens = tokens.slice(index, index + size);

      if (new Set(ngramTokens).size === 1 || !hasUsefulNgramTokens(ngramTokens)) {
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
    .filter(([, value]) => value.conteggio >= minCount)
    .sort((a, b) => b[1].conteggio - a[1].conteggio || b[1].lunghezza - a[1].lunghezza || a[0].localeCompare(b[0], "zh-Hans"))
    .slice(0, 80)
    .map(([frase, value]) =>
      withPinyin({
        frase,
        conteggio: value.conteggio,
        lunghezza: value.lunghezza,
        tipo: value.lunghezza === 2 ? "bigramma" : value.lunghezza === 3 ? "trigramma" : "quadrigramma"
      } satisfies PhraseStat)
    );
}

function splitLines(text: string) {
  return text
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);
}

function sentenceLikeChunks(text: string) {
  return text
    .replace(/\[[^\]]{1,40}\]/gu, " ")
    .split(/(?<=[。！？!?])|[\r\n]+/u)
    .map((line) => line.trim())
    .filter((line) => line.length >= 4 && line.length <= 180);
}

function extractSpeakerLines(text: string) {
  return splitLines(text)
    .map((line) => {
      const match = line.match(/^([\p{Script=Han}A-Za-z0-9·_\-\s]{1,18})[：:]\s*(.+)$/u);

      if (!match) {
        return null;
      }

      return {
        speaker: match[1].trim(),
        text: match[2].trim()
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
  const mentionData = getCharacterContexts(fullText, aliases);
  const contextText =
    speakerMatches.length > 0 ? speakerMatches.map((line) => line.text).join("\n") : mentionData.contexts.join("\n");
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
    .sort((a, b) => b.menzioni - a.menzioni || a.personaggio.localeCompare(b.personaggio, "zh-Hans"))
    .slice(0, 20);
}

function detectGrammarPatterns(text: string): ConstructionStat[] {
  const chunks = sentenceLikeChunks(text);

  return grammarPatterns
    .map((pattern) => {
      const examples: string[] = [];
      let count = 0;

      for (const chunk of chunks) {
        const matches = chunk.match(pattern.regex)?.length ?? 0;

        if (matches > 0) {
          count += matches;
          if (examples.length < 3) {
            examples.push(chunk);
          }
        }
      }

      return {
        costrutto: pattern.label,
        tipo: "pattern" as const,
        conteggio: count,
        esempi: examples,
        pinyin: generatePinyin(pattern.label)
      };
    })
    .filter((pattern) => pattern.conteggio > 0)
    .sort((a, b) => b.conteggio - a.conteggio || a.costrutto.localeCompare(b.costrutto, "zh-Hans"));
}

function extractFormulaNgrams(text: string) {
  const tokens = tokenizeTranscript(text, { keepStopwords: true });

  return buildNgrams(tokens, [3, 4, 5, 6], 2)
    .filter((phrase) => {
      const phraseTokens = phrase.frase.split(/\s+/u);
      const compact = compactHan(phrase.frase);
      const hasMarker = phraseTokens.some((token) => structuralMarkers.has(token));
      const looksFormula = onlyHanRegex.test(compact) && compact.length >= 4 && compact.length <= 14;

      return hasMarker || looksFormula;
    })
    .slice(0, 25)
    .map((phrase) => ({
      costrutto: phrase.frase,
      tipo: "formula" as const,
      conteggio: phrase.conteggio,
      esempi: [],
      pinyin: phrase.pinyin
    }));
}

function extractIdiomsAndExpressions(text: string, topCombinazioni: PhraseStat[], formulaNgrams: ConstructionStat[]) {
  const candidates = new Map<string, number>();

  for (const match of stripTranscriptMarkup(text).matchAll(/[\p{Script=Han}]{4}/gu)) {
    const phrase = match[0];
    if (knownIdioms.has(phrase)) {
      candidates.set(phrase, (candidates.get(phrase) ?? 0) + 1);
    }
  }

  for (const phrase of [...topCombinazioni, ...formulaNgrams.map((item) => ({
    frase: item.costrutto,
    conteggio: item.conteggio,
    lunghezza: item.costrutto.split(/\s+/u).length,
    tipo: "formula" as const,
    pinyin: item.pinyin
  }))]) {
    const compact = compactHan(phrase.frase);
    const looksLikeIdiom = knownIdioms.has(compact) || /^[\p{Script=Han}]{4,8}$/u.test(compact);
    const hasSpecificity = phrase.frase.split(/\s+/u).some((token) => token.length >= 2 && !stopwords.has(token));

    if (phrase.conteggio >= 2 && hasSpecificity && looksLikeIdiom) {
      candidates.set(compact || phrase.frase, Math.max(candidates.get(compact || phrase.frase) ?? 0, phrase.conteggio));
    }
  }

  return [...candidates.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-Hans"))
    .slice(0, 25)
    .map(([frase, conteggio]) =>
      withPinyin({
        frase,
        conteggio,
        lunghezza: [...frase].length,
        tipo: knownIdioms.has(frase) ? "chengyu" : "formula"
      } satisfies PhraseStat)
    );
}

function extractReferences(text: string) {
  const quoted = [...text.matchAll(/[“《(（]([^”》)）]{2,18})[”》)）]/gu)].map((match) => match[1]);
  const candidates = new Map<string, number>();

  for (const value of quoted) {
    const token = normalizeToken(value);

    if (token && !stopwords.has(token)) {
      candidates.set(token, (candidates.get(token) ?? 0) + 1);
    }
  }

  for (const [term, count] of countDomainTerms(text)) {
    candidates.set(term, Math.max(candidates.get(term) ?? 0, count));
  }

  return getTopEntries(candidates, [...candidates.values()].reduce((sum, count) => sum + count, 0), 30, 2);
}

function normalizePhrase(phrase: string) {
  return tokenizeTranscript(phrase, { keepStopwords: true }).join(" ");
}

function countPhraseOccurrences(tokens: string[], phrase: string) {
  const phraseTokens = phrase.split(" ").filter(Boolean);

  if (phraseTokens.length === 0) {
    return { count: 0, positions: [] };
  }

  let count = 0;
  const positions: number[] = [];

  for (let index = 0; index <= tokens.length - phraseTokens.length; index += 1) {
    const matches = phraseTokens.every((token, tokenIndex) => tokens[index + tokenIndex] === token);

    if (matches) {
      count += 1;
      positions.push(index + 1);
    }
  }

  return { count, positions };
}

function parseTargetList(values: string[] | undefined) {
  return (values ?? [])
    .flatMap((value) => value.split(/[\n,;，；]+/u))
    .map((value) => value.trim())
    .filter(Boolean);
}

function analyzeTargets(tokens: string[], total: number, targetWords: string[], targetPhrases: string[]) {
  const counts = new Map<string, number>();
  const wordPositions = new Map<string, number[]>();

  tokens.forEach((token, index) => {
    counts.set(token, (counts.get(token) ?? 0) + 1);
    const positions = wordPositions.get(token) ?? [];
    positions.push(index + 1);
    wordPositions.set(token, positions);
  });

  const words: TargetStat[] = parseTargetList(targetWords).map((value) => {
    const normalized = normalizeToken(value);
    const count = counts.get(normalized) ?? 0;

    return {
      valore: value,
      normalizzato: normalized,
      tipo: "parola",
      conteggio: count,
      densita: total > 0 ? Number(((count / total) * 100).toFixed(2)) : 0,
      posizioni: (wordPositions.get(normalized) ?? []).slice(0, 100)
    };
  });

  const phrases: TargetStat[] = parseTargetList(targetPhrases).map((value) => {
    const normalized = normalizePhrase(value);
    const result = countPhraseOccurrences(tokens, normalized);

    return {
      valore: value,
      normalizzato: normalized,
      tipo: "frase",
      conteggio: result.count,
      densita: total > 0 ? Number(((result.count / total) * 100).toFixed(2)) : 0,
      posizioni: result.positions.slice(0, 100)
    };
  });

  return [...words, ...phrases].filter((target) => target.normalizzato);
}

export function analyzeTranscript(
  text: string,
  targetWord?: string | null,
  targetPhrase?: string | null,
  options: { personaggi?: CharacterInput[]; targetWords?: string[]; targetPhrases?: string[] } = {}
): TranscriptAnalysis {
  const tokens = tokenizeTranscript(text);
  const allTokens = tokenizeTranscript(text, { keepStopwords: true });
  const counts = new Map<string, number>();

  for (const token of tokens) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }

  for (const [term, count] of countDomainTerms(text)) {
    counts.set(term, Math.max(counts.get(term) ?? 0, count));
  }

  const targetWords = [...(targetWord ? [targetWord] : []), ...(options.targetWords ?? [])];
  const targetPhrases = [...(targetPhrase ? [targetPhrase] : []), ...(options.targetPhrases ?? [])];
  const target = analyzeTargets(allTokens, Math.max(tokens.length, 1), targetWords, targetPhrases);
  const topParole = getTopEntries(counts, tokens.length, 80, 2);
  const topCombinazioni = buildNgrams(tokens);
  const grammarConstructions = detectGrammarPatterns(text);
  const formulaConstructions = extractFormulaNgrams(text);
  const costruttiRicorrenti = [...grammarConstructions, ...formulaConstructions]
    .sort((a, b) => b.conteggio - a.conteggio || a.costrutto.localeCompare(b.costrutto, "zh-Hans"))
    .slice(0, 40);
  const personaggi = extractCharacterStats(text, options.personaggi);
  const modiDiDire = extractIdiomsAndExpressions(text, topCombinazioni, formulaConstructions);
  const riferimenti = extractReferences(text);
  const firstWordTarget = target.find((item) => item.tipo === "parola") ?? null;
  const firstPhraseTarget = target.find((item) => item.tipo === "frase") ?? null;

  return {
    totaleToken: tokens.length,
    tokenUnici: counts.size,
    topParole,
    topCombinazioni,
    personaggi,
    modiDiDire,
    riferimenti,
    costruttiRicorrenti,
    target,
    parolaTarget: firstWordTarget?.normalizzato ?? null,
    occorrenzeTarget: firstWordTarget?.conteggio ?? null,
    densitaTarget: firstWordTarget?.densita ?? null,
    fraseTarget: firstPhraseTarget?.normalizzato ?? null,
    occorrenzeFraseTarget: firstPhraseTarget?.conteggio ?? null,
    posizioniTarget: firstWordTarget?.posizioni ?? firstPhraseTarget?.posizioni ?? [],
    note:
      "Analisi mandarino zh-Hans v2: segmentazione lessicale cinese, stopword funzionali, conteggi su parole compiute, rilevamento di costrutti ricorrenti, formule grammaticali e possibili modi di dire."
  };
}
