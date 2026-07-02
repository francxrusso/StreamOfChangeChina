import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const SUPPORTED_EXTENSIONS = new Set([".txt", ".md", ".srt", ".vtt", ".csv", ".docx"]);
const CHINESE_NUMBERS = new Map([
  ["一", 1],
  ["二", 2],
  ["三", 3],
  ["四", 4],
  ["五", 5],
  ["六", 6],
  ["七", 7],
  ["八", 8],
  ["九", 9],
  ["十", 10]
]);

function readEnv() {
  return Object.fromEntries(
    fs
      .readFileSync(".env.local", "utf8")
      .split(/\n/)
      .filter((line) => line.trim() && !line.trim().startsWith("#"))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1)];
      })
  );
}

function normalizeLineEndings(text) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

function cleanSubtitleText(text) {
  const lines = normalizeLineEndings(text).split("\n");

  return lines
    .filter((line) => !/^\d+$/.test(line.trim()))
    .join("\n")
    .replace(/^WEBVTT[^\n]*\n?/i, "")
    .trim();
}

function extractTextFromDocx(filePath) {
  const pythonCode = String.raw`
import re
import sys
import zipfile
from xml.etree import ElementTree

path = sys.argv[1]
namespaces = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}

with zipfile.ZipFile(path) as archive:
    xml = archive.read("word/document.xml")

root = ElementTree.fromstring(xml)
paragraphs = []

for paragraph in root.findall(".//w:p", namespaces):
    parts = []
    for node in paragraph.iter():
        tag = node.tag.split("}")[-1]
        if tag == "t" and node.text:
            parts.append(node.text)
        elif tag == "tab":
            parts.append("\t")
        elif tag == "br":
            parts.append("\n")
    text = "".join(parts).strip()
    if text:
        paragraphs.append(text)

print("\n".join(paragraphs))
`;

  return execFileSync(process.env.PYTHON ?? "python3", ["-c", pythonCode, filePath], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 40
  });
}

function readTranscriptFile(filePath) {
  const extension = path.extname(filePath).toLowerCase();

  if (extension === ".docx") {
    return normalizeLineEndings(extractTextFromDocx(filePath));
  }

  const content = fs.readFileSync(filePath, "utf8");

  if (extension === ".srt" || extension === ".vtt") {
    return normalizeLineEndings(cleanSubtitleText(content));
  }

  return normalizeLineEndings(content);
}

function episodeNumberFromChineseName(name) {
  const match = name.match(/第\s*([一二三四五六七八九十])\s*(?:集|话|話|期|episode|ep)?/i);
  return match ? CHINESE_NUMBERS.get(match[1]) ?? null : null;
}

function episodeNumberFromFileName(fileName) {
  const name = path.basename(fileName, path.extname(fileName));
  const chineseNumber = episodeNumberFromChineseName(name);

  if (chineseNumber) {
    return chineseNumber;
  }

  const explicitEpisode = name.match(/(?:^|[^a-z0-9])(?:ep|episode|episodio|puntata|e)\s*0?([1-9]|10)(?:[^0-9]|$)/i);

  if (explicitEpisode) {
    return Number(explicitEpisode[1]);
  }

  const standaloneNumber = name.match(/(?:^|[^0-9])0?([1-9]|10)(?:[^0-9]|$)/);

  return standaloneNumber ? Number(standaloneNumber[1]) : null;
}

function collectTranscriptFiles(directoryPath) {
  if (!fs.existsSync(directoryPath)) {
    throw new Error(`Cartella non trovata: ${directoryPath}`);
  }

  const files = fs
    .readdirSync(directoryPath)
    .map((fileName) => path.join(directoryPath, fileName))
    .filter((filePath) => fs.statSync(filePath).isFile())
    .filter((filePath) => SUPPORTED_EXTENSIONS.has(path.extname(filePath).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, "it"));

  if (files.length === 0) {
    throw new Error(`Nessuna trascrizione trovata in ${directoryPath}`);
  }

  return files;
}

function mapFilesToEpisodes(files) {
  const mapped = files.map((filePath) => ({
    filePath,
    episodeNumber: episodeNumberFromFileName(path.basename(filePath))
  }));

  const mappedCount = mapped.filter((item) => item.episodeNumber).length;

  if (mappedCount === 0 && mapped.length === 10) {
    return mapped.map((item, index) => ({ ...item, episodeNumber: index + 1 }));
  }

  const selected = mapped.filter((item) => item.episodeNumber >= 1 && item.episodeNumber <= 10);

  if (selected.length === 0) {
    const missing = mapped.filter((item) => !item.episodeNumber);
    throw new Error(
      `Non riesco a capire il numero episodio per: ${missing
        .map((item) => path.basename(item.filePath))
        .join(", ")}. Rinomina i file con ep01, ep02... oppure lascia solo 10 file ordinati nella cartella.`
    );
  }

  const duplicates = selected
    .map((item) => item.episodeNumber)
    .filter((episodeNumber, index, episodeNumbers) => episodeNumbers.indexOf(episodeNumber) !== index);

  if (duplicates.length > 0) {
    throw new Error(`Ci sono file duplicati per gli episodi: ${[...new Set(duplicates)].join(", ")}`);
  }

  return selected;
}

const transcriptDirectory = path.resolve(process.argv[2] ?? process.env.TRANSCRIPT_DIR ?? "../imports/the-untamed-transcripts");
const env = readEnv();
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const files = collectTranscriptFiles(transcriptDirectory);
const transcripts = mapFilesToEpisodes(files).map((item) => ({
  ...item,
  transcript: readTranscriptFile(item.filePath)
}));

const emptyTranscripts = transcripts.filter((item) => item.transcript.length === 0);

if (emptyTranscripts.length > 0) {
  throw new Error(`Trascrizioni vuote: ${emptyTranscripts.map((item) => path.basename(item.filePath)).join(", ")}`);
}

const { data: series, error: seriesError } = await supabase
  .from("serie_tv")
  .select("id,titolo_originale,titolo_inglese")
  .or("titolo_originale.eq.陈情令,titolo_inglese.eq.The Untamed")
  .limit(1);

if (seriesError) {
  throw seriesError;
}

const theUntamed = series?.[0];

if (!theUntamed) {
  throw new Error("Serie The Untamed / 陈情令 non trovata nel database.");
}

const results = [];

for (const item of transcripts) {
  const { data: episode, error: episodeError } = await supabase
    .from("episodi")
    .select("id,numero_episodio")
    .eq("serie_id", theUntamed.id)
    .eq("stagione", 1)
    .eq("numero_episodio", item.episodeNumber)
    .single();

  if (episodeError) {
    throw episodeError;
  }

  const { error: updateError } = await supabase
    .from("episodi")
    .update({ trascrizione: item.transcript })
    .eq("id", episode.id);

  if (updateError) {
    throw updateError;
  }

  results.push({
    episodio: item.episodeNumber,
    file: path.basename(item.filePath),
    caratteri: item.transcript.length
  });
}

console.log(
  JSON.stringify(
    {
      serie_id: theUntamed.id,
      transcript_directory: transcriptDirectory,
      loaded: results.length,
      results
    },
    null,
    2
  )
);
