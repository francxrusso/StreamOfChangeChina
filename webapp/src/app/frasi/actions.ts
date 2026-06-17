"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireEditSession } from "@/app/access-actions";
import { createServerSupabaseClient } from "@/lib/supabase-server";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Errore sconosciuto durante l'operazione.";
}

function safeReturnTo(value: FormDataEntryValue | null) {
  const returnTo = typeof value === "string" ? value : "";

  if (!returnTo.startsWith("/frasi")) {
    return "/frasi";
  }

  return returnTo;
}

function frasiRedirect(returnTo: string, status: "success" | "error", message: string): never {
  const separator = returnTo.includes("?") ? "&" : "?";
  redirect(`${returnTo}${separator}status=${status}&message=${encodeURIComponent(message)}`);
}

export async function deleteLessicoRecord(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const returnTo = safeReturnTo(formData.get("return_to"));
  let status: "success" | "error" = "success";
  let message = "Elemento lessicale eliminato correttamente.";

  try {
    await requireEditSession();

    if (!id) {
      throw new Error("Elemento lessicale mancante.");
    }

    const supabase = createServerSupabaseClient();

    if (!supabase) {
      throw new Error("Client Supabase non disponibile.");
    }

    const { error, count } = await supabase
      .from("frasi_parole")
      .delete({ count: "exact" })
      .eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    if (count === 0) {
      throw new Error("Nessun elemento eliminato. Potrebbe essere gia stato rimosso.");
    }

    revalidatePath("/frasi");
    revalidatePath("/admin");
  } catch (error) {
    status = "error";
    message = getErrorMessage(error);
  }

  frasiRedirect(returnTo, status, message);
}
