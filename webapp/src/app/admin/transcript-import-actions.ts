"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireEditSession } from "../access-actions";
import { createSupabaseAdminClient } from "@/lib/supabase";

type EpisodeImportMatch = {
  episodeNumber: number;
  fileName: string;
  transcript: string;
};

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

function adminRedirect(status: "success" | "error", message: string, serieId?: string) {
  const params = new URLSearchParams({
    tab: "episodi",
    status,
    message
  });

  if (serieId) {
    params.set("serie", serieId);
  }

  redirect(`/admin?${params.toString()}`);
}

function normalizeTranscript(text: string) {
  return text
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
}

function extractChineseEpisodeNumber(fileName: string) {
  const match = fileName.match(/第\s*([一二三四五六七八九十])\s*(?:集|话|話|期)?/i);
  return match ? CHINESE_NUMBERS.get(match[1]) ?? null : null;
}

function extractEpisodeNumber(fileName: string) {
  const chineseNumber = extractChineseEpisodeNumber(fileName);

  if (chineseNumber) {
    return chineseNumber;
  }

  const explicitMatch = fileName.match(/(?:^|[^a-z0-9])(?:ep|episode|episodio|puntata|e)\s*0?([1-9]\d*)(?:[^0-9]|$)/i);

  if (explicitMatch) {
    return Number(explicitMatch[1]);
  }

  const standaloneMatch = fileName.match(/(?:^|[^0-9])0?([1-9]\d*)(?:[^0-9]|$)/);

  return standaloneMatch ? Number(standaloneMatch[1]) : null;
}

function isTxtFile(file: File) {
  return file.name.toLowerCase().endsWith(".txt") || file.type === "text/plain";
}

async function decodeFile(file: File) {
  const buffer = await file.arrayBuffer();
  return normalizeTranscript(new TextDecoder("utf-8").decode(buffer));
}

function buildErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Errore sconosciuto durante l'import.";
}

export async function importEpisodeTranscripts(formData: FormData) {
  const serieId = String(formData.get("serie_id") ?? "").trim();
  const stagione = Number.parseInt(String(formData.get("stagione") ?? "1"), 10);
  const overwriteExisting = formData.get("overwrite_existing") === "on";
  let status: "success" | "error" = "success";
  let message = "";

  try {
    await requireEditSession();

    if (!serieId) {
      throw new Error("Seleziona una serie prima di importare le trascrizioni.");
    }

    if (!Number.isInteger(stagione) || stagione < 1) {
      throw new Error("Inserisci una stagione valida.");
    }

    const files = formData
      .getAll("transcripts")
      .filter((value): value is File => value instanceof File && value.size > 0);

    if (files.length === 0) {
      throw new Error("Carica almeno un file .txt.");
    }

    const invalidFiles = files.filter((file) => !isTxtFile(file));

    if (invalidFiles.length > 0) {
      throw new Error(`Sono ammessi solo file .txt: ${invalidFiles.map((file) => file.name).join(", ")}`);
    }

    const matches: EpisodeImportMatch[] = [];
    const unknownFiles: string[] = [];

    for (const file of files) {
      const episodeNumber = extractEpisodeNumber(file.name);

      if (!episodeNumber) {
        unknownFiles.push(file.name);
        continue;
      }

      const transcript = await decodeFile(file);

      if (!transcript) {
        throw new Error(`Il file ${file.name} e vuoto.`);
      }

      matches.push({
        episodeNumber,
        fileName: file.name,
        transcript
      });
    }

    if (unknownFiles.length > 0) {
      throw new Error(
        `Non riesco a capire l'episodio da questi nomi file: ${unknownFiles.join(
          ", "
        )}. Usa nomi come ep01.txt, episode 1.txt o episodio 1.txt.`
      );
    }

    const duplicatedEpisodes = matches
      .map((match) => match.episodeNumber)
      .filter((episodeNumber, index, episodeNumbers) => episodeNumbers.indexOf(episodeNumber) !== index);

    if (duplicatedEpisodes.length > 0) {
      throw new Error(`Ci sono piu file per lo stesso episodio: ${[...new Set(duplicatedEpisodes)].join(", ")}.`);
    }

    const supabase = createSupabaseAdminClient();
    const episodeNumbers = matches.map((match) => match.episodeNumber);
    const { data: episodes, error: episodesError } = await supabase
      .from("episodi")
      .select("id,numero_episodio,trascrizione")
      .eq("serie_id", serieId)
      .eq("stagione", stagione)
      .in("numero_episodio", episodeNumbers);

    if (episodesError) {
      throw new Error(episodesError.message);
    }

    const episodeByNumber = new Map((episodes ?? []).map((episode) => [Number(episode.numero_episodio), episode]));
    const missingEpisodes = episodeNumbers.filter((episodeNumber) => !episodeByNumber.has(episodeNumber));

    if (missingEpisodes.length > 0) {
      throw new Error(`Non trovo questi episodi nella serie selezionata: ${missingEpisodes.join(", ")}.`);
    }

    let imported = 0;
    let skipped = 0;

    for (const match of matches) {
      const episode = episodeByNumber.get(match.episodeNumber);

      if (!episode) {
        continue;
      }

      if (!overwriteExisting && typeof episode.trascrizione === "string" && episode.trascrizione.trim()) {
        skipped += 1;
        continue;
      }

      const { error: updateError } = await supabase
        .from("episodi")
        .update({ trascrizione: match.transcript })
        .eq("id", episode.id);

      if (updateError) {
        throw new Error(`Import non riuscito per ${match.fileName}: ${updateError.message}`);
      }

      imported += 1;
    }

    revalidatePath("/admin");
    message = `Trascrizioni importate: ${imported}. File saltati perche gia presenti: ${skipped}.`;
  } catch (error) {
    status = "error";
    message = buildErrorMessage(error);
  }

  adminRedirect(status, message, serieId);
}
