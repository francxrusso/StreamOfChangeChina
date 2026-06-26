"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireEditSession } from "@/app/access-actions";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { analyzeTranscript } from "@/lib/word-analysis";

type EpisodeForAnalysis = {
  id: string;
  serie_id: string;
  stagione: number | null;
  numero_episodio: number | null;
  titolo_originale: string | null;
  trascrizione: string | null;
};

function parseTextList(values: FormDataEntryValue[]) {
  return values
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean);
}

function parseNumberList(values: FormDataEntryValue[]) {
  return parseTextList(values)
    .map((value) => Number.parseInt(value, 10))
    .filter((value) => Number.isFinite(value));
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Errore sconosciuto durante l'operazione.";
}

function analysisRedirect(status: "success" | "error", message: string): never {
  redirect(`/analisi?status=${status}&message=${encodeURIComponent(message)}`);
}

function buildTitle(serieTitle: string, scopeTipo: string, seasons: number[], episodes: EpisodeForAnalysis[]) {
  if (scopeTipo === "stagioni" && seasons.length > 0) {
    return `${serieTitle} - Stagioni ${seasons.join(", ")}`;
  }

  if (scopeTipo === "episodi" && episodes.length > 0) {
    const episodeLabels = episodes
      .slice(0, 3)
      .map((episode) => `S${episode.stagione ?? "-"}E${episode.numero_episodio ?? "-"}`);
    const suffix = episodes.length > 3 ? ` +${episodes.length - 3}` : "";
    return `${serieTitle} - Episodi ${episodeLabels.join(", ")}${suffix}`;
  }

  return `${serieTitle} - Serie completa`;
}

export async function createAnalysisRun(formData: FormData) {
  const session = await requireEditSession();
  const serieId = String(formData.get("serie_id") ?? "");
  const scopeTipo = String(formData.get("scope_tipo") ?? "serie");
  const selectedSeasons = parseNumberList(formData.getAll("stagioni"));
  const selectedEpisodeIds = parseTextList(formData.getAll("episodio_ids"));
  const outputGrafici = formData.get("output_grafici") === "true";
  const targetWords = parseTextList([formData.get("parole_target") ?? ""]);
  const targetPhrases = parseTextList([formData.get("costrutti_target") ?? ""]);

  if (!serieId) {
    analysisRedirect("error", "Seleziona una serie.");
  }

  if (!["serie", "stagioni", "episodi"].includes(scopeTipo)) {
    analysisRedirect("error", "Tipo di selezione non valido.");
  }

  const supabase = createServerSupabaseClient();

  if (!supabase) {
    analysisRedirect("error", "Client Supabase non disponibile.");
  }

  const [
    { data: serie, error: serieError },
    { data: episodeData, error: episodesError },
    { data: characterData, error: charactersError }
  ] = await Promise.all([
    supabase.from("serie_tv").select("id,titolo_originale").eq("id", serieId).maybeSingle(),
    supabase
      .from("episodi")
      .select("id,serie_id,stagione,numero_episodio,titolo_originale,trascrizione")
      .eq("serie_id", serieId)
      .order("stagione", { ascending: true })
      .order("numero_episodio", { ascending: true }),
    supabase
      .from("personaggi")
      .select("id,nome_originale,nome_italiano,nome_pinyin")
      .eq("serie_id", serieId)
      .order("nome_originale", { ascending: true })
  ]);

  const firstError = serieError ?? episodesError ?? charactersError;

  if (firstError) {
    analysisRedirect("error", firstError.message);
  }

  if (!serie) {
    analysisRedirect("error", "Serie non trovata.");
  }

  const allEpisodes = (episodeData ?? []) as EpisodeForAnalysis[];
  const episodes = allEpisodes.filter((episode) => {
    if (scopeTipo === "stagioni") {
      return episode.stagione !== null && selectedSeasons.includes(episode.stagione);
    }

    if (scopeTipo === "episodi") {
      return selectedEpisodeIds.includes(episode.id);
    }

    return true;
  });

  if (scopeTipo === "stagioni" && selectedSeasons.length === 0) {
    analysisRedirect("error", "Seleziona almeno una stagione.");
  }

  if (scopeTipo === "episodi" && selectedEpisodeIds.length === 0) {
    analysisRedirect("error", "Seleziona almeno un episodio.");
  }

  const episodesWithTranscript = episodes.filter((episode) => episode.trascrizione?.trim());

  if (episodesWithTranscript.length === 0) {
    analysisRedirect("error", "Nessuna trascrizione disponibile per la selezione scelta.");
  }

  const combinedTranscript = episodesWithTranscript
    .map((episode) => episode.trascrizione)
    .filter(Boolean)
    .join("\n\n");
  const characters = (characterData ?? []).map((character) => ({
    id: String(character.id),
    nome_originale: String(character.nome_originale),
    nome_italiano: character.nome_italiano,
    nome_pinyin: character.nome_pinyin
  }));
  const analysis = analyzeTranscript(combinedTranscript, null, null, {
    personaggi: characters,
    targetWords,
    targetPhrases
  });
  const title = buildTitle(String(serie.titolo_originale), scopeTipo, selectedSeasons, episodesWithTranscript);

  const payload = {
    titolo: title,
    serie_id: serieId,
    scope_tipo: scopeTipo,
    stagioni: scopeTipo === "stagioni" ? selectedSeasons : [],
    episodio_ids: episodesWithTranscript.map((episode) => episode.id),
    output_grafici: outputGrafici,
    totale_episodi: episodesWithTranscript.length,
    totale_token: analysis.totaleToken,
    token_unici: analysis.tokenUnici,
    top_parole: analysis.topParole,
    top_combinazioni: analysis.topCombinazioni,
    statistiche: {
      modello_linguistico: "zh-mandarin-lexical-v2",
      target: analysis.target,
      personaggi: analysis.personaggi,
      costrutti_ricorrenti: analysis.costruttiRicorrenti,
      modi_di_dire: analysis.modiDiDire,
      riferimenti: analysis.riferimenti,
      episodi: episodesWithTranscript.map((episode) => ({
        id: episode.id,
        stagione: episode.stagione,
        numero_episodio: episode.numero_episodio,
        titolo_originale: episode.titolo_originale,
        token: analyzeTranscript(episode.trascrizione ?? "").totaleToken
      }))
    },
    note_ai: analysis.note,
    created_by: session.userId
  };

  const { data, error } = await supabase.from("analisi_create").insert(payload).select("id").single();

  if (error) {
    analysisRedirect("error", error.message);
  }

  revalidatePath("/analisi");
  redirect(`/analisi/${(data as { id: string }).id}`);
}

export async function deleteAnalysisRun(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  let status: "success" | "error" = "success";
  let message = "Analisi eliminata correttamente.";

  try {
    await requireEditSession();

    if (!id) {
      throw new Error("Analisi mancante.");
    }

    const supabase = createServerSupabaseClient();

    if (!supabase) {
      throw new Error("Client Supabase non disponibile.");
    }

    const { error, count } = await supabase.from("analisi_create").delete({ count: "exact" }).eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    if (count === 0) {
      throw new Error("Nessuna analisi eliminata. Potrebbe essere gia stata rimossa.");
    }

    revalidatePath("/analisi");
  } catch (error) {
    status = "error";
    message = getErrorMessage(error);
  }

  analysisRedirect(status, message);
}
