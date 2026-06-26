"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireEditSession } from "@/app/access-actions";
import { generateEpisodeEmotionAnalysis, generateEpisodeSummary, generateEpisodeThemeAnalysis } from "@/lib/episode-ai";
import { maybeGeneratePinyin } from "@/lib/pinyin";
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
  analisi_tematica_parole: string | null;
  analisi_emozioni: string | null;
  serie_tv: {
    titolo_originale: string;
  } | null;
};

function episodeRedirect(id: string, status: "success" | "error", message: string): never {
  redirect(`/episodi/${id}?status=${status}&message=${encodeURIComponent(message)}`);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Errore sconosciuto durante l'operazione.";
}

function parseOptionalText(value: FormDataEntryValue | null) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || null;
}

function parseOptionalNumber(value: FormDataEntryValue | null) {
  const text = typeof value === "string" ? value.trim() : "";

  if (!text) {
    return null;
  }

  const number = Number.parseFloat(text.replace(",", "."));
  return Number.isFinite(number) ? number : null;
}

function parseTextList(values: FormDataEntryValue[]) {
  return values
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean);
}

export async function generateEpisodeAIFields(formData: FormData) {
  const episodeId = String(formData.get("episodio_id") ?? "");
  const forceRegenerate = formData.get("force_regenerate") === "true";

  if (!episodeId) {
    throw new Error("Episodio mancante.");
  }

  let redirectStatus: "success" | "error" = "success";
  let redirectMessage = "";

  try {
    await requireEditSession();
    const supabase = createServerSupabaseClient();

    if (!supabase) {
      throw new Error("Client Supabase non disponibile.");
    }

    const { data, error } = await supabase
      .from("episodi")
      .select(
        "id,serie_id,stagione,numero_episodio,titolo_originale,link_episodio,trascrizione,sintesi_automatica,analisi_tematica_emotiva,analisi_tematica_parole,analisi_emozioni,serie_tv(titolo_originale)"
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

    const missingSummary = forceRegenerate || !episode.sintesi_automatica?.trim();
    const missingThemeAnalysis = forceRegenerate || !episode.analisi_tematica_parole?.trim();
    const missingEmotionAnalysis = forceRegenerate || !episode.analisi_emozioni?.trim();

    if (!missingSummary && !missingThemeAnalysis && !missingEmotionAnalysis) {
      redirectMessage = "Trama, analisi tematica e analisi emozioni erano gia presenti. Non ho sovrascritto nulla.";
    } else {
      const { data: characterData, error: characterError } = await supabase
        .from("personaggi")
        .select("id,nome_originale,nome_italiano,nome_pinyin")
        .eq("serie_id", episode.serie_id)
        .order("nome_originale", { ascending: true });

      if (characterError) {
        throw new Error(characterError.message);
      }

      const aiInput = {
        serieTitle: episode.serie_tv?.titolo_originale ?? "Serie non specificata",
        episodeTitle: episode.titolo_originale,
        season: episode.stagione,
        episodeNumber: episode.numero_episodio,
        transcript: episode.trascrizione,
        episodeLink: episode.link_episodio,
        characters: (characterData ?? []).map((character) => ({
          id: String(character.id),
          nome_originale: String(character.nome_originale),
          nome_italiano: character.nome_italiano,
          nome_pinyin: character.nome_pinyin
        }))
      };

      const updates: {
        sintesi_automatica?: string;
        analisi_tematica_parole?: string;
        analisi_emozioni?: string;
      } = {};

      if (missingSummary) {
        updates.sintesi_automatica = await generateEpisodeSummary(aiInput);
      }

      if (missingThemeAnalysis) {
        updates.analisi_tematica_parole = await generateEpisodeThemeAnalysis(aiInput);
      }

      if (missingEmotionAnalysis) {
        updates.analisi_emozioni = await generateEpisodeEmotionAnalysis(aiInput);
      }

      const { error: updateError } = await supabase.from("episodi").update(updates).eq("id", episodeId);

      if (updateError) {
        throw new Error(updateError.message);
      }

      revalidatePath(`/episodi/${episodeId}`);
      revalidatePath(`/serie/${episode.serie_id}`);

      const generatedFields = [
        missingSummary ? "trama/sintesi" : null,
        missingThemeAnalysis ? "analisi tematica per parole" : null,
        missingEmotionAnalysis ? "analisi emozioni" : null
      ].filter(Boolean);

      redirectMessage = forceRegenerate
        ? `Rigenerazione completata: ${generatedFields.join(" e ")} aggiornate.`
        : `Generazione completata: ${generatedFields.join(" e ")} generate.`;
    }
  } catch (error) {
    redirectStatus = "error";
    redirectMessage = getErrorMessage(error);
  }

  episodeRedirect(episodeId, redirectStatus, redirectMessage);
}

export async function createEpisodeLessico(formData: FormData) {
  const episodeId = String(formData.get("episodio_id") ?? "");
  const serieId = String(formData.get("serie_id") ?? "");

  if (!episodeId || !serieId) {
    throw new Error("Episodio o serie mancanti.");
  }

  let redirectStatus: "success" | "error" = "success";
  let redirectMessage = "Lessico aggiunto correttamente.";

  try {
    const session = await requireEditSession();
    const supabase = createServerSupabaseClient();

    if (!supabase) {
      throw new Error("Client Supabase non disponibile.");
    }

    const fraseOriginale = parseOptionalText(formData.get("frase_originale"));

    if (!fraseOriginale) {
      throw new Error("Inserisci una frase, parola o espressione.");
    }

    const emozioneIds = parseTextList(formData.getAll("emozione_ids"));
    const emozionePrincipaleId = emozioneIds[0] ?? null;
    const payload = {
      serie_id: serieId,
      episodio_id: episodeId,
      personaggio_id: parseOptionalText(formData.get("personaggio_id")),
      emozione_principale_id: emozionePrincipaleId,
      timecode_inizio_secondi: parseOptionalNumber(formData.get("timecode_inizio_secondi")),
      timecode_fine_secondi: parseOptionalNumber(formData.get("timecode_fine_secondi")),
      tipo: parseOptionalText(formData.get("tipo")) ?? "Frase",
      frase_originale: fraseOriginale,
      frase_pinyin: maybeGeneratePinyin(parseOptionalText(formData.get("frase_pinyin")), fraseOriginale),
      traduzione_italiana: parseOptionalText(formData.get("traduzione_italiana")),
      parola_chiave: parseOptionalText(formData.get("parola_chiave")),
      nota_analisi: parseOptionalText(formData.get("nota_analisi")),
      visibility: parseOptionalText(formData.get("visibility")) ?? "public",
      created_by: session.userId,
      updated_by: session.userId
    };

    const { data, error } = await supabase.from("frasi_parole").insert(payload).select("id").single();

    if (error) {
      throw new Error(error.message);
    }

    const fraseId = (data as { id: string } | null)?.id;

    if (fraseId && emozioneIds.length > 0) {
      const { error: emotionError } = await supabase
        .from("frasi_emozioni")
        .upsert(
          emozioneIds.map((emozioneId) => ({
            frase_id: fraseId,
            emozione_id: emozioneId,
            intensita: 3
          })),
          { onConflict: "frase_id,emozione_id" }
        );

      if (emotionError) {
        throw new Error(`Lessico creato, ma collegamento emozioni non riuscito: ${emotionError.message}`);
      }
    }

    revalidatePath(`/episodi/${episodeId}`);
    revalidatePath("/frasi");
    revalidatePath("/admin");
  } catch (error) {
    redirectStatus = "error";
    redirectMessage = getErrorMessage(error);
  }

  episodeRedirect(episodeId, redirectStatus, redirectMessage);
}
