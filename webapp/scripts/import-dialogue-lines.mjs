import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  fs
    .readFileSync(".env.local", "utf8")
    .split(/\n/)
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const index = line.indexOf("=");
      return [line.slice(0, index), line.slice(index + 1)];
    })
);

const speakerLineRegex = /^\s*([^：:\n]{1,24})[：:]\s*(.+)$/u;

function isPlausibleSpeakerLabel(value) {
  const label = value.trim();

  if (!label || /[\d()[\]（）《》<>]/u.test(label)) {
    return false;
  }

  return /^[\p{Script=Han}A-Za-zÀ-ÿ·.\s-]{1,24}$/u.test(label);
}

function parseSpeakerLines(text) {
  const lines = String(text ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const segments = [];

  for (const line of lines) {
    const match = line.match(speakerLineRegex);

    if (match && isPlausibleSpeakerLabel(match[1])) {
      segments.push({
        speaker: match[1].trim(),
        text: match[2].trim()
      });
      continue;
    }

    const lastSegment = segments.at(-1);
    if (lastSegment) {
      lastSegment.text = `${lastSegment.text} ${line}`.trim();
    }
  }

  return segments.length >= 3 ? segments : [];
}

function buildCharacterLookup(characters) {
  const lookup = new Map();

  for (const character of characters) {
    const serieLookup = lookup.get(character.serie_id) ?? new Map();

    for (const alias of [character.nome_originale, character.nome_italiano].filter(Boolean)) {
      serieLookup.set(String(alias).trim(), character.id);
    }

    lookup.set(character.serie_id, serieLookup);
  }

  return lookup;
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

const [{ data: episodes, error: episodesError }, { data: characters, error: charactersError }] = await Promise.all([
  supabase
    .from("episodi")
    .select("id, serie_id, stagione, numero_episodio, titolo_originale, trascrizione")
    .not("trascrizione", "is", null),
  supabase.from("personaggi").select("id, serie_id, nome_originale, nome_italiano")
]);

if (episodesError) {
  throw new Error(episodesError.message);
}

if (charactersError) {
  throw new Error(charactersError.message);
}

const characterLookup = buildCharacterLookup(characters ?? []);
let processedEpisodes = 0;
let importedLines = 0;
let matchedCharacters = 0;
let unmatchedSpeakers = new Set();

for (const episode of episodes ?? []) {
  const segments = parseSpeakerLines(episode.trascrizione);

  if (segments.length === 0) {
    continue;
  }

  const serieCharacters = characterLookup.get(episode.serie_id) ?? new Map();
  const payload = segments.map((segment, index) => {
    const personaggioId = serieCharacters.get(segment.speaker) ?? null;

    if (personaggioId) {
      matchedCharacters += 1;
    } else {
      unmatchedSpeakers.add(segment.speaker);
    }

    return {
      serie_id: episode.serie_id,
      episodio_id: episode.id,
      ordine: index + 1,
      personaggio_id: personaggioId,
      parlante_label: segment.speaker,
      testo_originale: segment.text,
      fonte: "trascrizione_marcata",
      confidenza: personaggioId ? 1 : 0.85,
      verifica_stato: personaggioId ? "verificata" : "da_verificare",
      visibility: "private"
    };
  });

  const { error } = await supabase
    .from("episodio_battute")
    .upsert(payload, { onConflict: "episodio_id,ordine" });

  if (error) {
    throw new Error(
      `Import fallito per episodio S${episode.stagione}E${episode.numero_episodio}: ${error.message}`
    );
  }

  processedEpisodes += 1;
  importedLines += payload.length;
}

console.log(
  JSON.stringify(
    {
      processedEpisodes,
      importedLines,
      matchedCharacters,
      unmatchedSpeakerLabels: unmatchedSpeakers.size,
      unmatchedExamples: Array.from(unmatchedSpeakers).slice(0, 30)
    },
    null,
    2
  )
);
