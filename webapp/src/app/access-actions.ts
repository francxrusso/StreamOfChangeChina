"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authCookieName, createSessionToken, verifySessionToken } from "@/lib/auth-session";
import { verifyPassword } from "@/lib/passwords";
import { createSupabaseAdminClient } from "@/lib/supabase";

type AdminUserRecord = {
  id: string;
  email: string;
  display_name: string;
  password_hash: string | null;
  is_active: boolean;
  can_edit: boolean;
};

export async function getAdminSession() {
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get(authCookieName)?.value);
}

export async function hasAdminSession() {
  return Boolean(await getAdminSession());
}

export async function requireAdminSession() {
  const session = await getAdminSession();

  if (!session) {
    throw new Error("Sessione non valida.");
  }

  return session;
}

export async function requireEditSession() {
  const session = await requireAdminSession();

  if (!session.canEdit) {
    throw new Error("Non hai i permessi per modificare i dati.");
  }

  return session;
}

export async function loginAdmin(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    throw new Error("Email e password sono obbligatorie.");
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("admin_users")
    .select("id,email,display_name,password_hash,is_active,can_edit")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const user = data as AdminUserRecord | null;

  if (!user || !user.is_active || !verifyPassword(password, user.password_hash)) {
    throw new Error("Credenziali non valide.");
  }

  const token = await createSessionToken({
    userId: user.id,
    email: user.email,
    displayName: user.display_name,
    canEdit: user.can_edit
  });

  const cookieStore = await cookies();
  cookieStore.set(authCookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/"
  });

  await supabase.from("admin_users").update({ last_login_at: new Date().toISOString() }).eq("id", user.id);

  revalidatePath("/", "layout");
  redirect("/");
}

export async function logoutAdmin() {
  const cookieStore = await cookies();
  cookieStore.set(authCookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });

  revalidatePath("/", "layout");
  redirect("/accesso");
}
