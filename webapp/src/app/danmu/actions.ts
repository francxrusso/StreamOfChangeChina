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

  if (!returnTo.startsWith("/danmu")) {
    return "/danmu";
  }

  return returnTo;
}

function danmuRedirect(returnTo: string, status: "success" | "error", message: string): never {
  const separator = returnTo.includes("?") ? "&" : "?";
  redirect(`${returnTo}${separator}status=${status}&message=${encodeURIComponent(message)}`);
}

export async function deleteDanmuRecord(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const returnTo = safeReturnTo(formData.get("return_to"));
  let status: "success" | "error" = "success";
  let message = "Danmu eliminato correttamente.";

  try {
    await requireEditSession();

    if (!id) {
      throw new Error("Danmu mancante.");
    }

    const supabase = createServerSupabaseClient();

    if (!supabase) {
      throw new Error("Client Supabase non disponibile.");
    }

    const { error, count } = await supabase
      .from("danmu")
      .delete({ count: "exact" })
      .eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    if (count === 0) {
      throw new Error("Nessun Danmu eliminato. Potrebbe essere gia stato rimosso.");
    }

    revalidatePath("/danmu");
    revalidatePath("/admin");
  } catch (error) {
    status = "error";
    message = getErrorMessage(error);
  }

  danmuRedirect(returnTo, status, message);
}
