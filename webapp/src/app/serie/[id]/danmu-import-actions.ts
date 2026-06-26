"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireEditSession } from "@/app/access-actions";
import { parseBilibiliDanmuXml, type BilibiliDanmuEntry } from "@/lib/bilibili-danmu";
import { createServerSupabaseClient } from "@/lib/supabase-server";

type EpisodeLookup = {
  id: string;
  serie_id: string;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Errore sconosciuto durante l'import.";
}

function safeReturnTo(value: FormDataEntryValue | null) {
  const returnTo = typeof value === "string" ? value : "/serie";

  if ((returnTo.startsWith("/serie/") || returnTo.startsWith("/episodi/")) && !returnTo.startsWith("//")) {
    return returnTo;
  }

  return "/serie";
}

function importRedirect(returnTo: string, status: "success" | "error", message: string): never {
  const separator = returnTo.includes("?") ? "&" : "?";
  redirect(`${returnTo}${separator}status=${status}&message=${encodeURIComponent(message)}`);
}

async function getExistingDanmuTexts(supabase: NonNullable<ReturnType<typeof createServerSupabaseClient>>, episodeId: string) {
  const texts = new Set<string>();
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("danmu")
      .select("testo_originale")
      .eq("episodio_id", episodeId)
      .range(from, from + pageSize - 1);

    if (error) {
      throw new Error(error.message);
    }

    for (const item of data ?? []) {
      if (typeof item.testo_originale === "string") {
        texts.add(item.testo_originale.trim());
      }
    }

    if (!data || data.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  return texts;
}

function chunkEntries(entries: BilibiliDanmuEntry[], size: number) {
  const chunks: BilibiliDanmuEntry[][] = [];

  for (let index = 0; index < entries.length; index += size) {
    chunks.push(entries.slice(index, index + size));
  }

  return chunks;
}

export async function importBilibiliDanmuXml(formData: FormData) {
  const returnTo = safeReturnTo(formData.get("return_to"));
  const serieId = String(formData.get("serie_id") ?? "");
  const episodeId = String(formData.get("episodio_id") ?? "");
  const file = formData.get("danmu_xml");
  let status: "success" | "error" = "success";
  let message = "";

  try {
    const session = await requireEditSession();

    if (!serieId || !episodeId) {
      throw new Error("Serie o episodio mancanti.");
    }

    if (!(file instanceof File) || file.size === 0) {
      throw new Error("Carica un file XML Bilibili valido.");
    }

    const supabase = createServerSupabaseClient();

    if (!supabase) {
      throw new Error("Client Supabase non disponibile.");
    }

    const { data: episodeData, error: episodeError } = await supabase
      .from("episodi")
      .select("id,serie_id")
      .eq("id", episodeId)
      .maybeSingle();

    if (episodeError) {
      throw new Error(episodeError.message);
    }

    const episode = episodeData as EpisodeLookup | null;

    if (!episode || episode.serie_id !== serieId) {
      throw new Error("Episodio non trovato o non collegato alla serie selezionata.");
    }

    const xml = await file.text();
    const parsed = parseBilibiliDanmuXml(xml);

    if (parsed.entries.length === 0) {
      throw new Error("Nessun danmu valido trovato nel file XML.");
    }

    const existingTexts = await getExistingDanmuTexts(supabase, episodeId);
    const entriesToInsert = parsed.entries.filter((entry) => !existingTexts.has(entry.testo_originale));
    const skippedExisting = parsed.entries.length - entriesToInsert.length;
    const importBatchId = crypto.randomUUID();

    for (const chunk of chunkEntries(entriesToInsert, 500)) {
      const { error: insertError } = await supabase.from("danmu").insert(
        chunk.map((entry) => ({
          serie_id: serieId,
          episodio_id: episodeId,
          timecode_secondi: entry.timecode_secondi,
          testo_originale: entry.testo_originale,
          piattaforma: "bilibili",
          visibility: "public",
          import_batch_id: importBatchId,
          source_row_number: entry.source_row_number,
          created_by: session.userId,
          updated_by: session.userId
        }))
      );

      if (insertError) {
        throw new Error(insertError.message);
      }
    }

    revalidatePath(returnTo);
    revalidatePath("/danmu");
    revalidatePath("/admin");

    message = `Import completato: ${entriesToInsert.length} danmu caricati. Duplicati nel file saltati: ${parsed.duplicateCount}. Gia presenti saltati: ${skippedExisting}.`;
  } catch (error) {
    status = "error";
    message = getErrorMessage(error);
  }

  importRedirect(returnTo, status, message);
}
