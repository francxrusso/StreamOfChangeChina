"use server";

import { revalidatePath } from "next/cache";
import { requireAdminSession } from "../access-actions";
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

export async function createAdminRecord(formData: FormData) {
  await requireAdminSession();
  const { resource, payload } = buildPayload(formData);
  const supabase = createSupabaseAdminClient();

  const { error } = await supabase.from(resource.table).insert(payload);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin");
}

export async function updateAdminRecord(formData: FormData) {
  await requireAdminSession();
  const { resource, payload } = buildPayload(formData);
  const primaryKeyFilter = buildPrimaryKeyFilter(formData, resource.primaryKey);
  const supabase = createSupabaseAdminClient();

  const { error } = await supabase.from(resource.table).update(payload).match(primaryKeyFilter);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin");
}

export async function deleteAdminRecord(formData: FormData) {
  await requireAdminSession();
  const resource = getAdminResource(String(formData.get("resource") ?? ""));
  const primaryKeyFilter = buildPrimaryKeyFilter(formData, resource.primaryKey);
  const supabase = createSupabaseAdminClient();

  const { error } = await supabase.from(resource.table).delete().match(primaryKeyFilter);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin");
}
