import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const projectRoot = path.resolve(process.cwd(), "..");
const webappRoot = process.cwd();

function loadEnv() {
  const envPath = path.join(webappRoot, ".env.local");
  const text = fs.readFileSync(envPath, "utf8");

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
    process.env[key] = process.env[key] ?? value;
  }
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === "\ufeff") continue;

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(field);
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
      field = "";
      continue;
    }

    field += char;
  }

  row.push(field);
  if (row.some((value) => value.trim() !== "")) rows.push(row);

  const [headers = [], ...data] = rows;
  return data.map((values) =>
    Object.fromEntries(headers.map((header, index) => [header.trim(), (values[index] ?? "").trim()]))
  );
}

function readCsv(filePath) {
  return parseCsv(fs.readFileSync(filePath, "utf8"));
}

function first(value) {
  const clean = String(value ?? "").trim();
  return clean || null;
}

function toInt(value) {
  const match = first(value)?.match(/-?\d+/);
  return match ? Number(match[0]) : null;
}

function toNumber(value) {
  const match = first(value)?.replace(",", ".").match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function toDate(value) {
  const clean = first(value);
  if (!clean) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;

  const match = clean.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;

  const [, dayOrMonth, monthOrDay, year] = match;
  const day = dayOrMonth.padStart(2, "0");
  const month = monthOrDay.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function posterUrl(value) {
  const clean = first(value);
  if (!clean) return null;
  const match = clean.match(/\((https?:\/\/[^)]+)\)/);
  return match?.[1] ?? clean;
}

function colorHex(value) {
  const mapping = {
    Verde: "#27ae60",
    Blu: "#3498db",
    Rosso: "#c0392b",
    Nero: "#2c3e50",
    Giallo: "#f1c40f",
    Viola: "#8e44ad"
  };
  return mapping[first(value) ?? ""] ?? null;
}

async function findOne(supabase, table, filters) {
  let query = supabase.from(table).select("*").limit(1);
  for (const [key, value] of Object.entries(filters)) {
    query = value === null ? query.is(key, null) : query.eq(key, value);
  }
  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(`${table}: ${error.message}`);
  return data;
}

async function insertOrUpdate(supabase, table, filters, payload) {
  const existing = await findOne(supabase, table, filters);

  if (existing) {
    const { data, error } = await supabase
      .from(table)
      .update(payload)
      .eq("id", existing.id)
      .select()
      .single();
    if (error) throw new Error(`${table}: ${error.message}`);
    return data;
  }

  const { data, error } = await supabase.from(table).insert(payload).select().single();
  if (error) throw new Error(`${table}: ${error.message}`);
  return data;
}

function csvPath(filename) {
  return path.join("/Users/francescarusso/Downloads", filename);
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing Supabase configuration. Check webapp/.env.local.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const files = {
  serie: readCsv(csvPath("Serie TV-Vista Tabellare.csv")),
  episodi: readCsv(csvPath("Episodi-Vista Tabellare.csv")),
  personaggi: readCsv(csvPath("Personaggi-Vista Tabellare.csv")),
  emozioni: readCsv(csvPath("Emozioni-Vista Tabellare.csv")),
  frasi: readCsv(csvPath("Frasi e Parole-Vista Tabellare.csv")),
  danmu: readCsv(csvPath("Danmu 弹幕-Vista Tabella.csv"))
};

const seriesByTitle = new Map();
const emotionsByName = new Map();
const episodesByKey = new Map();

console.log("Import serie TV...");
for (const row of files.serie) {
  const titolo = first(row["Titolo"]);
  if (!titolo) continue;

  const record = await insertOrUpdate(
    supabase,
    "serie_tv",
    { titolo_originale: titolo },
    {
      titolo_originale: titolo,
      titolo_inglese: first(row["Titolo Inglese"]),
      descrizione: first(row["Descrizione"]),
      anno: toInt(row["Anno di Uscita"]),
      stagioni: toInt(row["Stagioni"]),
      genere: first(row["Genere"]),
      poster_url: posterUrl(row["Poster"]),
      frasi_parole_ricorrenti_ai: first(row["Frasi/Parole Più Ricorrenti (AI)"]),
      visibility: "public"
    }
  );

  seriesByTitle.set(titolo, record);
}

console.log("Import emozioni...");
for (const row of files.emozioni) {
  const nome = first(row["Nome Emozione"]);
  if (!nome) continue;

  const record = await insertOrUpdate(
    supabase,
    "emozioni",
    { nome },
    {
      nome,
      descrizione: first(row["Descrizione"]),
      colore_assoc: first(row["Colore Associato"]),
      colore_hex: colorHex(row["Colore Associato"]),
      icona: first(row["Icona Emozione"]),
      sintesi_frasi_collegate_ai: first(row["Sintesi delle Frasi/Parole Collegate (AI)"]),
      analisi_semantica_frasi_ai: first(row["Analisi Semantica delle Frasi/Parole (AI)"])
    }
  );

  emotionsByName.set(nome, record);
}

console.log("Import episodi...");
for (const row of files.episodi) {
  const serie = seriesByTitle.get(first(row["Serie TV"]));
  if (!serie) continue;

  const stagione = toInt(row["Stagione"]) ?? 1;
  const numero = toInt(row["Episodio"]);
  if (!numero) continue;

  const record = await insertOrUpdate(
    supabase,
    "episodi",
    { serie_id: serie.id, stagione, numero_episodio: numero },
    {
      serie_id: serie.id,
      stagione,
      numero_episodio: numero,
      titolo_originale: first(row["Titolo Episodio"]),
      messa_in_onda: toDate(row["Messa In Onda"]),
      trascrizione: first(row["Trascrizione"]),
      sintesi_automatica: first(row["Sintesi Automatica Episodio"]),
      visibility: "public"
    }
  );

  episodesByKey.set(`${serie.titolo_originale}::${record.titolo_originale}`, record);
}

console.log("Import personaggi...");
for (const row of files.personaggi) {
  const serie = seriesByTitle.get(first(row["Serie TV di Origine"]));
  const nome = first(row["Nome"]);
  if (!serie || !nome) continue;

  await insertOrUpdate(
    supabase,
    "personaggi",
    { serie_id: serie.id, nome_originale: nome },
    {
      serie_id: serie.id,
      nome_originale: nome,
      genere: first(row["Genere"]),
      immagine_rappresentativa: first(row["Immagine Rappresentativa"]),
      note_admin: first(row["Note Aggiuntive"]),
      visibility: "public"
    }
  );
}

console.log("Import frasi e parole...");
for (const row of files.frasi) {
  const serie = seriesByTitle.get(first(row["Serie TV di Origine"]));
  const testo = first(row["Testo Frase o Parola"]);
  if (!serie || !testo) continue;

  const episodioTitolo = first(row["Titolo Episodio di Origine"]) || first(row["Episodio di Origine"]);
  const episodio = episodesByKey.get(`${serie.titolo_originale}::${episodioTitolo}`);
  const emozione = emotionsByName.get(first(row["Nome Emozione Principale"]) || first(row["Emozioni Associate"]));

  const frase = await insertOrUpdate(
    supabase,
    "frasi_parole",
    { serie_id: serie.id, frase_originale: testo },
    {
      serie_id: serie.id,
      episodio_id: episodio?.id ?? null,
      emozione_principale_id: emozione?.id ?? null,
      tipo: first(row["Tipo"]),
      frase_originale: testo,
      immagine_rappresentativa: first(row["Immagine Rappresentativa"]),
      sintesi_automatica: first(row["Sintesi Automatica Frase/Parola"]),
      classificazione_tematica_ai: first(row["Classificazione Tematica AI"]),
      note_admin: first(row["Note Aggiuntive"]),
      visibility: "public"
    }
  );

  if (emozione) {
    const { error } = await supabase.from("frasi_emozioni").upsert(
      {
        frase_id: frase.id,
        emozione_id: emozione.id,
        intensita: toInt(row["Intensità"])
      },
      { onConflict: "frase_id,emozione_id" }
    );
    if (error) throw new Error(`frasi_emozioni: ${error.message}`);
  }
}

console.log("Import Danmu pilota...");
for (const [index, row] of files.danmu.entries()) {
  const serie = seriesByTitle.get(first(row["Serie TV"]));
  const testo = first(row["Commento"]);
  if (!serie || !testo) continue;

  const episodio = episodesByKey.get(`${serie.titolo_originale}::${first(row["Episodi"])}`);

  await insertOrUpdate(
    supabase,
    "danmu",
    { serie_id: serie.id, testo_originale: testo },
    {
      serie_id: serie.id,
      episodio_id: episodio?.id ?? null,
      testo_originale: testo,
      traduzione_italiana: first(row["Traduzione"]),
      data_commento: toDate(row["Data creazione"]),
      timecode_secondi: toNumber(row["Minutaggio"]),
      sentiment: first(row["Sentiment"]),
      colore: first(row["Colore"]),
      like_ricevuti: toInt(row["Like ricevuti"]),
      note: first(row["Note"]),
      source_row_number: index + 1
    }
  );
}

console.log("Import completato.");
console.log(
  JSON.stringify(
    {
      serie: files.serie.length,
      episodi: files.episodi.length,
      personaggi: files.personaggi.length,
      emozioni: files.emozioni.length,
      frasi: files.frasi.length,
      danmu: files.danmu.length
    },
    null,
    2
  )
);
