"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireEditSession } from "../access-actions";
import { createSupabaseAdminClient } from "@/lib/supabase";
import { maybeGeneratePinyin } from "@/lib/pinyin";
import { formatSerieGenres } from "@/lib/serie-genres";
import { getAdminResource, type AdminField } from "./admin-config";

type AdminValue = string | number | null;

function parseValue(field: AdminField, value: FormDataEntryValue | null): AdminValue {
  const rawValue = typeof value === "string" ? value.trim() : "";

  if (rawValue === "") {
    return null;
  }

  if (field.type === "number") {
    return Number.parseInt(rawValue, 10);
  }

  if (field.type === "decimal") {
    return Number.parseFloat(rawValue);
  }

  return rawValue;
}

function parseFieldValue(field: AdminField, formData: FormData): AdminValue {
  if (field.type === "multiselect") {
    const values = formData
      .getAll(field.name)
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim())
      .filter(Boolean);

    return values.length > 0 ? formatSerieGenres(values) : null;
  }

  return parseValue(field, formData.get(field.name));
}

function buildPayload(formData: FormData) {
  const resource = getAdminResource(String(formData.get("resource") ?? ""));
  const payload: Record<string, AdminValue> = {};

  for (const field of resource.fields) {
    payload[field.name] = parseFieldValue(field, formData);
  }

  if (resource.key === "serie") {
    payload.titolo_pinyin = maybeGeneratePinyin(
      typeof payload.titolo_pinyin === "string" ? payload.titolo_pinyin : null,
      typeof payload.titolo_originale === "string" ? payload.titolo_originale : null
    );
  }

  if (resource.key === "episodi") {
    payload.titolo_pinyin = maybeGeneratePinyin(
      typeof payload.titolo_pinyin === "string" ? payload.titolo_pinyin : null,
      typeof payload.titolo_originale === "string" ? payload.titolo_originale : null
    );
  }

  if (resource.key === "personaggi") {
    payload.nome_pinyin = maybeGeneratePinyin(
      typeof payload.nome_pinyin === "string" ? payload.nome_pinyin : null,
      typeof payload.nome_originale === "string" ? payload.nome_originale : null
    );
  }

  if (resource.key === "frasi") {
    payload.frase_pinyin = maybeGeneratePinyin(
      typeof payload.frase_pinyin === "string" ? payload.frase_pinyin : null,
      typeof payload.frase_originale === "string" ? payload.frase_originale : null
    );
  }

  if (resource.key === "danmu") {
    payload.testo_pinyin = maybeGeneratePinyin(
      typeof payload.testo_pinyin === "string" ? payload.testo_pinyin : null,
      typeof payload.testo_originale === "string" ? payload.testo_originale : null
    );
  }

  return { resource, payload };
}

function buildPrimaryKeyFilter(formData: FormData, primaryKey: string[]) {
  return primaryKey.reduce<Record<string, string>>((filter, key) => {
    const value = String(formData.get(`pk_${key}`) ?? "");

    if (!value) {
      throw new Error("Chiave primaria mancante.");
    }

    filter[key] = value;
    return filter;
  }, {});
}

function adminRedirect(resourceKey: string, status: "success" | "error", message: string) {
  redirect(`/admin?tab=${resourceKey}&status=${status}&message=${encodeURIComponent(message)}`);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Errore sconosciuto durante l'operazione.";
}

export async function createAdminRecord(formData: FormData) {
  const resource = getAdminResource(String(formData.get("resource") ?? ""));
  let status: "success" | "error" = "success";
  let message = "Record creato correttamente.";

  try {
    await requireEditSession();
    const { payload } = buildPayload(formData);
    const supabase = createSupabaseAdminClient();

    const { error } = await supabase.from(resource.table).insert(payload);

    if (error) {
      status = "error";
      message = `Creazione non riuscita: ${error.message}`;
    } else {
      revalidatePath("/admin");
    }
  } catch (error) {
    status = "error";
    message = getErrorMessage(error);
  }

  adminRedirect(resource.key, status, message);
}

export async function updateAdminRecord(formData: FormData) {
  const resource = getAdminResource(String(formData.get("resource") ?? ""));
  let status: "success" | "error" = "success";
  let message = "Modifiche salvate correttamente.";

  try {
    await requireEditSession();
    const { payload } = buildPayload(formData);
    const primaryKeyFilter = buildPrimaryKeyFilter(formData, resource.primaryKey);
    const supabase = createSupabaseAdminClient();

    const { error, count } = await supabase
      .from(resource.table)
      .update(payload, { count: "exact" })
      .match(primaryKeyFilter);

    if (error) {
      status = "error";
      message = `Salvataggio non riuscito: ${error.message}`;
    } else if (count === 0) {
      status = "error";
      message = "Nessun record aggiornato. Il record potrebbe essere stato eliminato o non trovato.";
    } else {
      revalidatePath("/admin");
    }
  } catch (error) {
    status = "error";
    message = getErrorMessage(error);
  }

  adminRedirect(resource.key, status, message);
}

export async function deleteAdminRecord(formData: FormData) {
  const resource = getAdminResource(String(formData.get("resource") ?? ""));
  let status: "success" | "error" = "success";
  let message = "Record eliminato correttamente.";

  try {
    await requireEditSession();
    const primaryKeyFilter = buildPrimaryKeyFilter(formData, resource.primaryKey);
    const supabase = createSupabaseAdminClient();

    const { error, count } = await supabase
      .from(resource.table)
      .delete({ count: "exact" })
      .match(primaryKeyFilter);

    if (error) {
      status = "error";
      message = `Eliminazione non riuscita: ${error.message}`;
    } else if (count === 0) {
      status = "error";
      message = "Nessun record eliminato. Il record potrebbe essere gia stato rimosso.";
    } else {
      revalidatePath("/admin");
    }
  } catch (error) {
    status = "error";
    message = getErrorMessage(error);
  }

  adminRedirect(resource.key, status, message);
}
