import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { pinyin } from "pinyin-pro";

function readEnv() {
  return Object.fromEntries(
    fs
      .readFileSync(".env.local", "utf8")
      .split(/\n/)
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1)];
      })
  );
}

function generatePinyin(text) {
  const source = text?.trim();

  if (!source || !/\p{Script=Han}/u.test(source)) {
    return null;
  }

  const pinyinSource = source.match(/[\p{Script=Han}]+|[，。！？；：、,.!?;:（）《》“”]/gu)?.join("") ?? "";

  return pinyin(pinyinSource)
    .replace(/\s+([，。！？；：、,.!?;:])/gu, "$1")
    .replace(/([（《“])\s+/gu, "$1")
    .replace(/\s+([）》”])/gu, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

const env = readEnv();
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data, error } = await supabase
  .from("episodi")
  .select("id,titolo_originale,titolo_pinyin")
  .not("titolo_originale", "is", null);

if (error) {
  throw error;
}

let updated = 0;

for (const episodio of data ?? []) {
  const titoloPinyin = generatePinyin(episodio.titolo_originale);

  if (!titoloPinyin || titoloPinyin === episodio.titolo_pinyin) {
    continue;
  }

  const { error: updateError } = await supabase
    .from("episodi")
    .update({ titolo_pinyin: titoloPinyin })
    .eq("id", episodio.id);

  if (updateError) {
    throw updateError;
  }

  updated += 1;
}

console.log(JSON.stringify({ scanned: data?.length ?? 0, updated }, null, 2));
