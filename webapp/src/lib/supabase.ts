import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

export function createSupabaseAdminClient() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Configurazione admin Supabase mancante.");
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

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
  titolo_pinyin: string | null;
  titolo_italiano: string | null;
  messa_in_onda: string | null;
  durata_secondi: number | null;
  link_episodio: string | null;
  trascrizione: string | null;
  sintesi_automatica: string | null;
  analisi_tematica_emotiva: string | null;
  descrizione: string | null;
};

export type PublicPersonaggio = {
  id: string;
  serie_id: string;
  serie_titolo_originale: string;
  nome_originale: string;
  nome_pinyin: string | null;
  nome_italiano: string | null;
  genere: string | null;
  fascia_eta: string | null;
  lavoro: string | null;
  immagine_rappresentativa: string | null;
  descrizione: string | null;
};

export type PublicEmozione = {
  id: string;
  nome: string;
  descrizione: string | null;
  colore_assoc: string | null;
  colore_hex: string | null;
  icona: string | null;
  sintesi_frasi_collegate_ai: string | null;
  analisi_semantica_frasi_ai: string | null;
};

export type PublicFraseParola = {
  id: string;
  serie_id: string;
  serie_titolo_originale: string;
  stagione: number | null;
  numero_episodio: number | null;
  personaggio_nome_originale: string | null;
  emozione_principale: string | null;
  timecode_inizio_secondi: number | null;
  timecode_fine_secondi: number | null;
  tipo: string | null;
  frase_originale: string;
  frase_pinyin: string | null;
  traduzione_italiana: string | null;
  parola_chiave: string | null;
  immagine_rappresentativa: string | null;
  sintesi_automatica: string | null;
  classificazione_tematica_ai: string | null;
  nota_analisi: string | null;
  emozioni: string[];
};

export type PublicDanmu = {
  id: string;
  serie_id: string;
  serie_titolo_originale: string;
  stagione: number | null;
  numero_episodio: number | null;
  timecode_secondi: number | null;
  testo_originale: string;
  testo_pinyin: string | null;
  traduzione_italiana: string | null;
  piattaforma: string | null;
  data_commento: string | null;
  sentiment: string | null;
  colore: string | null;
  like_ricevuti: number | null;
  nota_analisi: string | null;
  emozioni: string[];
};
