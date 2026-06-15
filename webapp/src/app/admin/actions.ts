"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireEditSession } from "../access-actions";
import { createSupabaseAdminClient } from "@/lib/supabase";
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

function buildPayload(formData: FormData) {
  const resource = getAdminResource(String(formData.get("resource") ?? ""));
  const payload: Record<string, AdminValue> = {};

  for (const field of resource.fields) {
    payload[field.name] = parseValue(field, formData.get(field.name));
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
