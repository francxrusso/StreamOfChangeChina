export type BilibiliDanmuEntry = {
  timecode_secondi: number;
  testo_originale: string;
  source_row_number: number;
};

export type BilibiliDanmuParseResult = {
  entries: BilibiliDanmuEntry[];
  duplicateCount: number;
  skippedCount: number;
};

function decodeXmlEntities(value: string) {
  return value
    .replace(/&#x([0-9a-f]+);/giu, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/gu, (_, decimal: string) => String.fromCodePoint(Number.parseInt(decimal, 10)))
    .replace(/&quot;/gu, "\"")
    .replace(/&apos;/gu, "'")
    .replace(/&lt;/gu, "<")
    .replace(/&gt;/gu, ">")
    .replace(/&amp;/gu, "&");
}

function cleanDanmuText(value: string) {
  return decodeXmlEntities(value)
    .replace(/<[^>]+>/gu, " ")
    .replace(/[\u0000-\u001f\u007f]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function parsePAttribute(attributes: string) {
  const match = attributes.match(/\bp\s*=\s*(["'])(.*?)\1/u);
  const raw = match?.[2]?.split(",")[0]?.trim() ?? "";
  const time = Number.parseFloat(raw);

  return Number.isFinite(time) && time >= 0 ? Number(time.toFixed(3)) : null;
}

export function parseBilibiliDanmuXml(xml: string): BilibiliDanmuParseResult {
  const entries: BilibiliDanmuEntry[] = [];
  const seenTexts = new Set<string>();
  let duplicateCount = 0;
  let skippedCount = 0;
  let rowNumber = 0;

  for (const match of xml.matchAll(/<d\b([^>]*)>([\s\S]*?)<\/d>/gu)) {
    rowNumber += 1;
    const timecode = parsePAttribute(match[1]);
    const text = cleanDanmuText(match[2]);

    if (timecode === null || !text) {
      skippedCount += 1;
      continue;
    }

    if (seenTexts.has(text)) {
      duplicateCount += 1;
      continue;
    }

    seenTexts.add(text);
    entries.push({
      timecode_secondi: timecode,
      testo_originale: text,
      source_row_number: rowNumber
    });
  }

  entries.sort((a, b) => a.timecode_secondi - b.timecode_secondi || a.source_row_number - b.source_row_number);

  return { entries, duplicateCount, skippedCount };
}
