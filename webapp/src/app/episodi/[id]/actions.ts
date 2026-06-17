"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireEditSession } from "@/app/access-actions";
import { generateEpisodeSummary, generateEpisodeThematicEmotionalAnalysis } from "@/lib/episode-ai";
import { createServerSupabaseClient } from "@/lib/supabase-server";

type EpisodeForAI = {
  id: string;
  serie_id: string;
  stagione: number | null;
  numero_episodio: number | null;
  titolo_originale: string | null;
  link_episodio: string | null;
  trascrizione: string | null;
  sintesi_automatica: string | null;
  analisi_tematica_emotiva: string | null;
  serie_tv: {
    titolo_originale: string;
  } | null;
};

function episodeRedirect(id: string, status: "success" | "error", message: string): never {
  redirect(`/episodi/${id}?status=${status}&message=${encodeURIComponent(message)}`);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Errore sconosciuto durante la generazione AI.";
}

export async function generateEpisodeAIFields(formData: FormData) {
  const episodeId = String(formData.get("episodio_id") ?? "");

  if (!episodeId) {
    throw new Error("Episodio mancante.");
  }

  try {
    await requireEditSession();
    const supabase = createServerSupabaseClient();

    if (!supabase) {
      throw new Error("Client Supabase non disponibile.");
    }

    const { data, error } = await supabase
      .from("episodi")
      .select(
        "id,serie_id,stagione,numero_episodio,titolo_originale,link_episodio,trascrizione,sintesi_automatica,analisi_tematica_emotiva,serie_tv(titolo_originale)"
      )
      .eq("id", episodeId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    const episode = data as EpisodeForAI | null;

    if (!episode) {
      throw new Error("Episodio non trovato.");
    }

    if (!episode.trascrizione?.trim()) {
      throw new Error("Serve una trascrizione per generare sintesi e analisi.");
    }

    const missingSummary = !episode.sintesi_automatica?.trim();
    const missingAnalysis = !episode.analisi_tematica_emotiva?.trim();

    if (!missingSummary && !missingAnalysis) {
      episodeRedirect(episodeId, "success", "Sintesi e analisi erano gia presenti. Non ho sovrascritto nulla.");
    }

    const aiInput = {
      serieTitle: episode.serie_tv?.titolo_originale ?? "Serie non specificata",
      episodeTitle: episode.titolo_originale,
      season: episode.stagione,
      episodeNumber: episode.numero_episodio,
      transcript: episode.trascrizione,
      episodeLink: episode.link_episodio
    };

    const updates: {
      sintesi_automatica?: string;
      analisi_tematica_emotiva?: string;
    } = {};

    if (missingSummary) {
      updates.sintesi_automatica = await generateEpisodeSummary(aiInput);
    }

    if (missingAnalysis) {
      updates.analisi_tematica_emotiva = await generateEpisodeThematicEmotionalAnalysis(aiInput);
    }

    const { error: updateError } = await supabase.from("episodi").update(updates).eq("id", episodeId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    revalidatePath(`/episodi/${episodeId}`);
    revalidatePath(`/serie/${episode.serie_id}`);

    const generatedFields = [
      missingSummary ? "sintesi" : null,
      missingAnalysis ? "analisi tematica ed emotiva" : null
    ].filter(Boolean);

    episodeRedirect(episodeId, "success", `AI completata: ${generatedFields.join(" e ")} generate.`);
  } catch (error) {
    episodeRedirect(episodeId, "error", getErrorMessage(error));
  }
}
