"use server";

import { revalidatePath } from "next/cache";
import { requireEditSession } from "@/app/access-actions";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { analyzeTranscript } from "@/lib/word-analysis";

type EpisodeForAnalysis = {
  id: string;
  serie_id: string;
  trascrizione: string | null;
};

export async function saveEpisodeAnalysis(formData: FormData) {
  const session = await requireEditSession();
  const episodioId = String(formData.get("episodio_id") ?? "");
  const parolaTarget = String(formData.get("parola_target") ?? "").trim() || null;

  if (!episodioId) {
    throw new Error("Seleziona un episodio.");
  }

  const supabase = createServerSupabaseClient();

  if (!supabase) {
    throw new Error("Client Supabase non disponibile.");
  }

  const { data, error } = await supabase
    .from("episodi")
    .select("id,serie_id,trascrizione")
    .eq("id", episodioId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const episodio = data as EpisodeForAnalysis | null;

  if (!episodio?.trascrizione) {
    throw new Error("Trascrizione non disponibile per questo episodio.");
  }

  const analysis = analyzeTranscript(episodio.trascrizione, parolaTarget);

  const { error: insertError } = await supabase.from("analisi_episodi").insert({
    episodio_id: episodio.id,
    serie_id: episodio.serie_id,
    tipo: "word_frequency",
    parola_target: analysis.parolaTarget,
    totale_token: analysis.totaleToken,
    token_unici: analysis.tokenUnici,
    occorrenze_target: analysis.occorrenzeTarget,
    top_parole: analysis.topParole,
    statistiche: {
      densita_target: analysis.densitaTarget,
      posizioni_target: analysis.posizioniTarget
    },
    note_ai: analysis.note,
    created_by: session.userId
  });

  if (insertError) {
    throw new Error(insertError.message);
  }

  revalidatePath("/analisi");
}
