import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function hasSupabaseConfig() {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

function createSupabaseClient() {
  if (!hasSupabaseConfig()) {
    return null;
  }

  try {
    return createClient(supabaseUrl as string, supabaseAnonKey as string);
  } catch {
    return null;
  }
}

export const supabase = createSupabaseClient();

export type PublicSerie = {
  id: string;
  titolo_originale: string;
  titolo_pinyin: string | null;
  titolo_italiano: string | null;
  titolo_inglese: string | null;
  anno: number | null;
  stagioni: number | null;
  genere: string | null;
  piattaforma: string | null;
  tipo_distribuzione: string | null;
  poster_url: string | null;
  descrizione: string | null;
  frasi_parole_ricorrenti_ai: string | null;
  note_pubbliche: string | null;
};

export type PublicEpisodio = {
  id: string;
  serie_id: string;
  serie_titolo_originale: string;
  stagione: number | null;
  numero_episodio: number | null;
  titolo_originale: string | null;
  titolo_italiano: string | null;
  messa_in_onda: string | null;
  durata_secondi: number | null;
  trascrizione: string | null;
  sintesi_automatica: string | null;
  analisi_tematica_emotiva: string | null;
  descrizione: string | null;
};
