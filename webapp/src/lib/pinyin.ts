import { pinyin } from "pinyin-pro";

const hanRegex = /\p{Script=Han}/u;
const pinyinSourceRegex = /[\p{Script=Han}]+|[，。！？；：、,.!?;:（）《》“”]/gu;

function extractPinyinSource(text: string) {
  return text.match(pinyinSourceRegex)?.join("") ?? "";
}

export function generatePinyin(text: string | null | undefined) {
  const source = text?.trim();

  if (!source || !hanRegex.test(source)) {
    return null;
  }

  return pinyin(extractPinyinSource(source))
    .replace(/\s+([，。！？；：、,.!?;:])/gu, "$1")
    .replace(/([（《“])\s+/gu, "$1")
    .replace(/\s+([）》”])/gu, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

export function maybeGeneratePinyin(currentValue: string | null | undefined, sourceValue: string | null | undefined) {
  return currentValue?.trim() || generatePinyin(sourceValue);
}
