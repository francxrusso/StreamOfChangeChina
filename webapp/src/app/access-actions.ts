"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash } from "node:crypto";

const adminCookieName = "scc_admin_session";

function adminPasswordHash() {
  const password = process.env.ADMIN_PASSWORD;

  if (!password) {
    return null;
  }

  return createHash("sha256").update(password).digest("hex");
}

export async function hasAdminSession() {
  const expectedHash = adminPasswordHash();

  if (!expectedHash) {
    return false;
  }

  const cookieStore = await cookies();
  return cookieStore.get(adminCookieName)?.value === expectedHash;
}

export async function requireAdminSession() {
  if (!(await hasAdminSession())) {
    throw new Error("Sessione admin non valida.");
  }
}

export async function loginAdmin(formData: FormData) {
  const expectedHash = adminPasswordHash();
  const password = String(formData.get("password") ?? "");

  if (!expectedHash || createHash("sha256").update(password).digest("hex") !== expectedHash) {
    throw new Error("Password admin non valida.");
  }

  const cookieStore = await cookies();
  cookieStore.set(adminCookieName, expectedHash, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/"
  });

  revalidatePath("/", "layout");
  redirect("/");
}

export async function logoutAdmin() {
  const cookieStore = await cookies();
  cookieStore.set(adminCookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });

  revalidatePath("/", "layout");
  redirect("/accesso");
}
