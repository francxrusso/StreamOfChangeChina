"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireEditSession } from "@/app/access-actions";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { normalizeCharacterGender } from "@/lib/character-genders";
import { maybeGeneratePinyin } from "@/lib/pinyin";
import { formatSerieGenres } from "@/lib/serie-genres";

type QuickResource =
  | "serie"
  | "episodi"
  | "personaggi"
  | "emozioni"
  | "frasi"
  | "danmu"
  | "analisi";

type ResourceConfig = {
  table: string;
  fields: string[];
  revalidate: string[];
};

const resourceConfig: Record<QuickResource, ResourceConfig> = {
  serie: {
    table: "serie_tv",
    fields: [
      "titolo_originale",
      "titolo_pinyin",
      "titolo_italiano",
      "titolo_inglese",
      "anno",
      "stagioni",
      "genere",
      "gestione_personaggi",
      "piattaforma",
      "poster_url",
      "descrizione",
      "visibility"
    ],
    revalidate: ["/serie", "/admin"]
  },
  episodi: {
    table: "episodi",
    fields: [
      "stagione",
      "numero_episodio",
      "titolo_originale",
      "titolo_pinyin",
      "titolo_italiano",
      "messa_in_onda",
      "link_episodio",
      "trascrizione",
      "sintesi_automatica",
      "visibility"
    ],
    revalidate: ["/serie", "/admin"]
  },
  personaggi: {
    table: "personaggi",
    fields: [
      "nome_originale",
      "nome_pinyin",
      "nome_italiano",
      "genere",
      "fascia_eta",
      "lavoro",
      "immagine_rappresentativa",
      "descrizione",
      "visibility"
    ],
    revalidate: ["/serie", "/admin"]
  },
  emozioni: {
    table: "emozioni",
    fields: ["nome", "descrizione", "colore_assoc", "colore_hex", "icona", "sintesi_frasi_collegate_ai", "analisi_semantica_frasi_ai"],
    revalidate: ["/emozioni", "/admin"]
  },
  frasi: {
    table: "frasi_parole",
    fields: [
      "tipo",
      "frase_originale",
      "frase_pinyin",
      "traduzione_italiana",
      "parola_chiave",
      "nota_analisi",
      "visibility"
    ],
    revalidate: ["/frasi", "/admin"]
  },
  danmu: {
    table: "danmu",
    fields: ["testo_originale", "testo_pinyin", "traduzione_italiana", "sentiment", "nota_analisi", "visibility"],
    revalidate: ["/danmu", "/admin"]
  },
  analisi: {
    table: "analisi_create",
    fields: ["titolo", "output_grafici", "note_ai"],
    revalidate: ["/analisi", "/admin"]
  }
};

const numericFields = new Set(["anno", "stagioni", "stagione", "numero_episodio"]);

function getConfig(resource: string) {
  const config = resourceConfig[resource as QuickResource];

  if (!config) {
    throw new Error("Risorsa non valida.");
  }

  return config;
}

function safeReturnTo(value: FormDataEntryValue | null) {
  const returnTo = typeof value === "string" ? value : "/";
  return returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/";
}

function parseValue(field: string, value: FormDataEntryValue | null) {
  const raw = typeof value === "string" ? value.trim() : "";

  if (raw === "") {
    return null;
  }

  if (raw === "true") {
    return true;
  }

  if (raw === "false") {
    return false;
  }

  if (numericFields.has(field)) {
    const number = Number.parseInt(raw, 10);
    return Number.isFinite(number) ? number : null;
  }

  return raw;
}

function parseQuickFieldValue(field: string, formData: FormData) {
  if (field === "genere") {
    const values = formData
      .getAll(field)
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim())
      .filter(Boolean);

    return values.length > 0 ? formatSerieGenres(values) : null;
  }

  return parseValue(field, formData.get(field));
}

type QuickValue = string | number | boolean | null;

function normalizePayload(resource: QuickResource, payload: Record<string, QuickValue>) {
  if (resource === "serie") {
    payload.titolo_pinyin = maybeGeneratePinyin(
      typeof payload.titolo_pinyin === "string" ? payload.titolo_pinyin : null,
      typeof payload.titolo_originale === "string" ? payload.titolo_originale : null
    );
  }

  if (resource === "episodi") {
    payload.titolo_pinyin = maybeGeneratePinyin(
      typeof payload.titolo_pinyin === "string" ? payload.titolo_pinyin : null,
      typeof payload.titolo_originale === "string" ? payload.titolo_originale : null
    );
  }

  if (resource === "personaggi") {
    payload.nome_pinyin = maybeGeneratePinyin(
      typeof payload.nome_pinyin === "string" ? payload.nome_pinyin : null,
      typeof payload.nome_originale === "string" ? payload.nome_originale : null
    );
    payload.genere = normalizeCharacterGender(typeof payload.genere === "string" ? payload.genere : null);
  }

  if (resource === "frasi") {
    payload.frase_pinyin = maybeGeneratePinyin(
      typeof payload.frase_pinyin === "string" ? payload.frase_pinyin : null,
      typeof payload.frase_originale === "string" ? payload.frase_originale : null
    );
  }

  if (resource === "danmu") {
    payload.testo_pinyin = maybeGeneratePinyin(
      typeof payload.testo_pinyin === "string" ? payload.testo_pinyin : null,
      typeof payload.testo_originale === "string" ? payload.testo_originale : null
    );
  }

  return payload;
}

function redirectWithNotice(returnTo: string, status: "success" | "error", message: string): never {
  const separator = returnTo.includes("?") ? "&" : "?";
  redirect(`${returnTo}${separator}status=${status}&message=${encodeURIComponent(message)}`);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Errore sconosciuto durante l'operazione.";
}

export async function updateQuickAdminRecord(formData: FormData) {
  const resource = String(formData.get("resource") ?? "") as QuickResource;
  const id = String(formData.get("id") ?? "");
  const returnTo = safeReturnTo(formData.get("return_to"));
  let status: "success" | "error" = "success";
  let message = "Modifiche salvate correttamente.";

  try {
    await requireEditSession();

    if (!id) {
      throw new Error("Record mancante.");
    }

    const config = getConfig(resource);
    const payload: Record<string, QuickValue> = {};

    for (const field of config.fields) {
      if (formData.has(field)) {
        payload[field] = parseQuickFieldValue(field, formData);
      }
    }

    const supabase = createServerSupabaseClient();

    if (!supabase) {
      throw new Error("Client Supabase non disponibile.");
    }

    const { error, count } = await supabase
      .from(config.table)
      .update(normalizePayload(resource, payload), { count: "exact" })
      .eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    if (count === 0) {
      throw new Error("Nessun record aggiornato.");
    }

    for (const path of config.revalidate) {
      revalidatePath(path);
    }
    revalidatePath(returnTo.split("?")[0]);
  } catch (error) {
    status = "error";
    message = getErrorMessage(error);
  }

  redirectWithNotice(returnTo, status, message);
}

export async function deleteQuickAdminRecord(formData: FormData) {
  const resource = String(formData.get("resource") ?? "");
  const id = String(formData.get("id") ?? "");
  const returnTo = safeReturnTo(formData.get("return_to"));
  let status: "success" | "error" = "success";
  let message = "Record eliminato correttamente.";

  try {
    await requireEditSession();

    if (!id) {
      throw new Error("Record mancante.");
    }

    const config = getConfig(resource);
    const supabase = createServerSupabaseClient();

    if (!supabase) {
      throw new Error("Client Supabase non disponibile.");
    }

    const { error, count } = await supabase.from(config.table).delete({ count: "exact" }).eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    if (count === 0) {
      throw new Error("Nessun record eliminato.");
    }

    for (const path of config.revalidate) {
      revalidatePath(path);
    }
    revalidatePath(returnTo.split("?")[0]);
  } catch (error) {
    status = "error";
    message = getErrorMessage(error);
  }

  redirectWithNotice(returnTo, status, message);
}
