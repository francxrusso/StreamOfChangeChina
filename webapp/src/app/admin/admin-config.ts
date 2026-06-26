import { SERIE_GENRE_OPTIONS, getSerieGenreLabel } from "@/lib/serie-genres";

export type AdminFieldType =
  | "text"
  | "textarea"
  | "number"
  | "decimal"
  | "date"
  | "datetime"
  | "select"
  | "multiselect"
  | "uuid";

export type AdminField = {
  name: string;
  label: string;
  type: AdminFieldType;
  required?: boolean;
  options?: Array<string | { value: string; label: string }>;
  relation?: "serie" | "episodi" | "personaggi" | "emozioni" | "frasi" | "danmu" | "battute";
};

export type AdminResource = {
  key: string;
  label: string;
  table: string;
  primaryKey: string[];
  orderBy?: string;
  summaryFields: string[];
  searchFields?: string[];
  fields: AdminField[];
};

export const adminResources = [
  {
    key: "serie",
    label: "Serie TV",
    table: "serie_tv",
    primaryKey: ["id"],
    orderBy: "titolo_originale",
    summaryFields: ["titolo_originale", "anno", "visibility"],
    searchFields: ["titolo_originale", "titolo_pinyin", "titolo_italiano", "titolo_inglese", "genere", "piattaforma"],
    fields: [
      { name: "titolo_originale", label: "Titolo originale", type: "text", required: true },
      { name: "titolo_pinyin", label: "Titolo pinyin", type: "text" },
      { name: "titolo_italiano", label: "Titolo italiano", type: "text" },
      { name: "titolo_inglese", label: "Titolo inglese", type: "text" },
      { name: "anno", label: "Anno", type: "number" },
      { name: "stagioni", label: "Stagioni", type: "number" },
      {
        name: "genere",
        label: "Genere",
        type: "multiselect",
        options: SERIE_GENRE_OPTIONS.map((genre) => ({
          value: genre.value,
          label: getSerieGenreLabel(genre.value)
        }))
      },
      {
        name: "gestione_personaggi",
        label: "Inserire personaggi",
        type: "select",
        required: true,
        options: [
          { value: "true", label: "Si, gestisci personaggi" },
          { value: "false", label: "No, non usare personaggi" }
        ]
      },
      { name: "piattaforma", label: "Piattaforma", type: "text" },
      { name: "tipo_distribuzione", label: "Distribuzione", type: "select", options: ["tv", "streaming", "ibrida"] },
      { name: "poster_url", label: "Poster URL", type: "text" },
      { name: "descrizione", label: "Descrizione", type: "textarea" },
      { name: "frasi_parole_ricorrenti_ai", label: "Frasi/parole ricorrenti AI", type: "textarea" },
      { name: "note_pubbliche", label: "Note pubbliche", type: "textarea" },
      { name: "note_admin", label: "Note admin", type: "textarea" },
      { name: "visibility", label: "Visibilita", type: "select", options: ["public", "private"], required: true }
    ]
  },
  {
    key: "episodi",
    label: "Episodi",
    table: "episodi",
    primaryKey: ["id"],
    orderBy: "created_at",
    summaryFields: ["serie_id", "stagione", "numero_episodio", "titolo_originale", "visibility"],
    searchFields: ["titolo_originale", "titolo_pinyin", "titolo_italiano", "trascrizione", "sintesi_automatica", "descrizione"],
    fields: [
      { name: "serie_id", label: "Serie", type: "uuid", relation: "serie", required: true },
      { name: "stagione", label: "Stagione", type: "number", required: true },
      { name: "numero_episodio", label: "Numero episodio", type: "number", required: true },
      { name: "titolo_originale", label: "Titolo originale", type: "text" },
      { name: "titolo_pinyin", label: "Titolo pinyin", type: "text" },
      { name: "titolo_italiano", label: "Titolo italiano", type: "text" },
      { name: "messa_in_onda", label: "Messa in onda", type: "date" },
      { name: "durata_secondi", label: "Durata secondi", type: "number" },
      { name: "link_episodio", label: "Link episodio", type: "text" },
      { name: "trascrizione", label: "Trascrizione", type: "textarea" },
      { name: "sintesi_automatica", label: "Sintesi automatica", type: "textarea" },
      { name: "analisi_tematica_emotiva", label: "Analisi tematica/emotiva", type: "textarea" },
      { name: "descrizione", label: "Descrizione", type: "textarea" },
      { name: "note_admin", label: "Note admin", type: "textarea" },
      { name: "visibility", label: "Visibilita", type: "select", options: ["public", "private"], required: true }
    ]
  },
  {
    key: "personaggi",
    label: "Personaggi",
    table: "personaggi",
    primaryKey: ["id"],
    orderBy: "nome_originale",
    summaryFields: ["nome_originale", "serie_id", "genere", "fascia_eta", "lavoro", "visibility"],
    searchFields: ["nome_originale", "nome_pinyin", "nome_italiano", "genere", "fascia_eta", "lavoro", "descrizione"],
    fields: [
      { name: "serie_id", label: "Serie", type: "uuid", relation: "serie", required: true },
      { name: "nome_originale", label: "Nome originale", type: "text", required: true },
      { name: "nome_pinyin", label: "Nome pinyin", type: "text" },
      { name: "nome_italiano", label: "Nome italiano", type: "text" },
      { name: "genere", label: "Genere", type: "text" },
      { name: "fascia_eta", label: "Fascia d'eta", type: "text" },
      { name: "lavoro", label: "Lavoro", type: "text" },
      { name: "immagine_rappresentativa", label: "Immagine", type: "text" },
      { name: "descrizione", label: "Descrizione", type: "textarea" },
      { name: "note_admin", label: "Note admin", type: "textarea" },
      { name: "visibility", label: "Visibilita", type: "select", options: ["public", "private"], required: true }
    ]
  },
  {
    key: "emozioni",
    label: "Emozioni",
    table: "emozioni",
    primaryKey: ["id"],
    orderBy: "nome",
    summaryFields: ["nome", "colore_hex", "icona"],
    searchFields: ["nome", "descrizione", "colore_assoc", "sintesi_frasi_collegate_ai"],
    fields: [
      { name: "nome", label: "Nome", type: "text", required: true },
      { name: "descrizione", label: "Descrizione", type: "textarea" },
      { name: "colore_assoc", label: "Colore associato", type: "text" },
      { name: "colore_hex", label: "Colore hex", type: "text" },
      { name: "icona", label: "Icona", type: "text" },
      { name: "sintesi_frasi_collegate_ai", label: "Sintesi frasi collegate AI", type: "textarea" },
      { name: "analisi_semantica_frasi_ai", label: "Analisi semantica frasi AI", type: "textarea" }
    ]
  },
  {
    key: "frasi",
    label: "Lessico",
    table: "frasi_parole",
    primaryKey: ["id"],
    orderBy: "created_at",
    summaryFields: ["frase_originale", "serie_id", "tipo", "visibility"],
    searchFields: ["frase_originale", "frase_pinyin", "traduzione_italiana", "parola_chiave", "sintesi_automatica", "nota_analisi"],
    fields: [
      { name: "serie_id", label: "Serie", type: "uuid", relation: "serie", required: true },
      { name: "episodio_id", label: "Episodio", type: "uuid", relation: "episodi" },
      { name: "personaggio_id", label: "Personaggio", type: "uuid", relation: "personaggi" },
      { name: "emozione_principale_id", label: "Emozione principale", type: "uuid", relation: "emozioni" },
      { name: "timecode_inizio_secondi", label: "Timecode inizio", type: "decimal" },
      { name: "timecode_fine_secondi", label: "Timecode fine", type: "decimal" },
      { name: "tipo", label: "Tipo", type: "select", options: ["Frase", "Parola", "Espressione"] },
      { name: "frase_originale", label: "Frase originale", type: "textarea", required: true },
      { name: "frase_pinyin", label: "Frase pinyin", type: "textarea" },
      { name: "traduzione_italiana", label: "Traduzione italiana", type: "textarea" },
      { name: "parola_chiave", label: "Parola chiave", type: "text" },
      { name: "immagine_rappresentativa", label: "Immagine", type: "text" },
      { name: "sintesi_automatica", label: "Sintesi automatica", type: "textarea" },
      { name: "classificazione_tematica_ai", label: "Classificazione tematica AI", type: "textarea" },
      { name: "nota_analisi", label: "Nota analisi", type: "textarea" },
      { name: "note_admin", label: "Note admin", type: "textarea" },
      { name: "visibility", label: "Visibilita", type: "select", options: ["public", "private"], required: true }
    ]
  },
  {
    key: "danmu",
    label: "Danmu",
    table: "danmu",
    primaryKey: ["id"],
    orderBy: "created_at",
    summaryFields: ["testo_originale", "serie_id", "timecode_secondi", "visibility"],
    searchFields: ["testo_originale", "testo_pinyin", "traduzione_italiana", "piattaforma", "sentiment", "nota_analisi", "note_admin", "note"],
    fields: [
      { name: "serie_id", label: "Serie", type: "uuid", relation: "serie", required: true },
      { name: "episodio_id", label: "Episodio", type: "uuid", relation: "episodi" },
      { name: "timecode_secondi", label: "Timecode secondi", type: "decimal" },
      { name: "testo_originale", label: "Testo originale", type: "textarea", required: true },
      { name: "testo_pinyin", label: "Testo pinyin", type: "textarea" },
      { name: "traduzione_italiana", label: "Traduzione italiana", type: "textarea" },
      { name: "piattaforma", label: "Piattaforma", type: "text" },
      { name: "data_commento", label: "Data commento", type: "datetime" },
      { name: "autore_hash", label: "Autore hash", type: "text" },
      { name: "sentiment", label: "Sentiment", type: "text" },
      { name: "colore", label: "Colore", type: "text" },
      { name: "like_ricevuti", label: "Like ricevuti", type: "number" },
      { name: "nota_analisi", label: "Nota analisi", type: "textarea" },
      { name: "note_admin", label: "Note admin", type: "textarea" },
      { name: "note", label: "Note", type: "textarea" },
      { name: "visibility", label: "Visibilita", type: "select", options: ["public", "private"], required: true },
      { name: "import_batch_id", label: "Import batch ID", type: "uuid" },
      { name: "source_row_number", label: "Numero riga origine", type: "number" }
    ]
  },
  {
    key: "battute",
    label: "Battute episodio",
    table: "episodio_battute",
    primaryKey: ["id"],
    orderBy: "ordine",
    summaryFields: ["parlante_label", "testo_originale", "episodio_id", "verifica_stato"],
    searchFields: ["parlante_label", "testo_originale", "fonte", "verifica_stato", "note_admin"],
    fields: [
      { name: "serie_id", label: "Serie", type: "uuid", relation: "serie", required: true },
      { name: "episodio_id", label: "Episodio", type: "uuid", relation: "episodi", required: true },
      { name: "ordine", label: "Ordine", type: "number", required: true },
      { name: "personaggio_id", label: "Personaggio verificato", type: "uuid", relation: "personaggi" },
      { name: "parlante_label", label: "Parlante", type: "text", required: true },
      { name: "testo_originale", label: "Battuta originale", type: "textarea", required: true },
      { name: "timecode_inizio_secondi", label: "Timecode inizio", type: "decimal" },
      { name: "timecode_fine_secondi", label: "Timecode fine", type: "decimal" },
      { name: "fonte", label: "Fonte", type: "select", options: ["trascrizione_marcata", "video", "manuale"], required: true },
      { name: "confidenza", label: "Confidenza", type: "decimal" },
      { name: "verifica_stato", label: "Stato verifica", type: "select", options: ["verificata", "da_verificare", "incerta"], required: true },
      { name: "note_admin", label: "Note admin", type: "textarea" },
      { name: "visibility", label: "Visibilita", type: "select", options: ["public", "private"], required: true }
    ]
  },
  {
    key: "frasi_emozioni",
    label: "Emozioni frasi",
    table: "frasi_emozioni",
    primaryKey: ["frase_id", "emozione_id"],
    summaryFields: ["frase_id", "emozione_id", "intensita"],
    fields: [
      { name: "frase_id", label: "Frase/parola", type: "uuid", relation: "frasi", required: true },
      { name: "emozione_id", label: "Emozione", type: "uuid", relation: "emozioni", required: true },
      { name: "intensita", label: "Intensita", type: "number" },
      { name: "note", label: "Note", type: "textarea" }
    ]
  },
  {
    key: "danmu_emozioni",
    label: "Emozioni danmu",
    table: "danmu_emozioni",
    primaryKey: ["danmu_id", "emozione_id"],
    summaryFields: ["danmu_id", "emozione_id", "intensita"],
    fields: [
      { name: "danmu_id", label: "Danmu", type: "uuid", relation: "danmu", required: true },
      { name: "emozione_id", label: "Emozione", type: "uuid", relation: "emozioni", required: true },
      { name: "intensita", label: "Intensita", type: "number" },
      { name: "note", label: "Note", type: "textarea" }
    ]
  }
] satisfies AdminResource[];

export function getAdminResource(key: string | undefined) {
  return adminResources.find((resource) => resource.key === key) ?? adminResources[0];
}
