"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireEditSession } from "@/app/access-actions";
import { hashPassword } from "@/lib/passwords";
import { createSupabaseAdminClient } from "@/lib/supabase";

function getBoolean(formData: FormData, name: string) {
  return formData.get(name) === "on";
}

function usersRedirect(status: "success" | "error", message: string) {
  redirect(`/admin/utenti?status=${status}&message=${encodeURIComponent(message)}`);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Errore sconosciuto durante l'operazione.";
}

export async function createUser(formData: FormData) {
  let status: "success" | "error" = "success";
  let message = "Utente creato correttamente.";

  try {
    await requireEditSession();

    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const displayName = String(formData.get("display_name") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const canEdit = getBoolean(formData, "can_edit");

    if (!email || !displayName || password.length < 8) {
      throw new Error("Email, nome e password di almeno 8 caratteri sono obbligatori.");
    }

    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.from("admin_users").insert({
      email,
      display_name: displayName,
      password_hash: hashPassword(password),
      is_active: true,
      can_edit: canEdit
    });

    if (error) {
      status = "error";
      message = `Creazione utente non riuscita: ${error.message}`;
    } else {
      revalidatePath("/admin/utenti");
    }
  } catch (error) {
    status = "error";
    message = getErrorMessage(error);
  }

  usersRedirect(status, message);
}

export async function updateUser(formData: FormData) {
  let status: "success" | "error" = "success";
  let message = "Utente aggiornato correttamente.";

  try {
    await requireEditSession();

    const id = String(formData.get("id") ?? "");
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const displayName = String(formData.get("display_name") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const payload: Record<string, string | boolean> = {
      email,
      display_name: displayName,
      is_active: getBoolean(formData, "is_active"),
      can_edit: getBoolean(formData, "can_edit")
    };

    if (!id || !email || !displayName) {
      throw new Error("Dati utente incompleti.");
    }

    if (password) {
      if (password.length < 8) {
        throw new Error("La nuova password deve avere almeno 8 caratteri.");
      }
      payload.password_hash = hashPassword(password);
    }

    const supabase = createSupabaseAdminClient();
    const { error, count } = await supabase
      .from("admin_users")
      .update(payload, { count: "exact" })
      .eq("id", id);

    if (error) {
      status = "error";
      message = `Salvataggio utente non riuscito: ${error.message}`;
    } else if (count === 0) {
      status = "error";
      message = "Nessun utente aggiornato. L'utente potrebbe essere stato eliminato.";
    } else {
      revalidatePath("/admin/utenti");
    }
  } catch (error) {
    status = "error";
    message = getErrorMessage(error);
  }

  usersRedirect(status, message);
}
