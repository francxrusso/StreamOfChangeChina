"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireEditSession } from "@/app/access-actions";
import { createServerSupabaseClient } from "@/lib/supabase-server";

const DANMU_SCREENSHOT_BUCKET = "danmu-screenshots";
const MAX_SCREENSHOT_BYTES = 8 * 1024 * 1024;

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

function parseOptionalText(value: FormDataEntryValue | null) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || null;
}

function getScreenshotExtension(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase();

  if (fromName && /^[a-z0-9]{2,5}$/u.test(fromName)) {
    return fromName === "jpeg" ? "jpg" : fromName;
  }

  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/gif") return "gif";
  return "jpg";
}

async function ensureScreenshotBucket(supabase: NonNullable<ReturnType<typeof createServerSupabaseClient>>) {
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();

  if (listError) {
    throw new Error(listError.message);
  }

  if (buckets?.some((bucket) => bucket.name === DANMU_SCREENSHOT_BUCKET)) {
    return;
  }

  const { error } = await supabase.storage.createBucket(DANMU_SCREENSHOT_BUCKET, {
    public: false,
    fileSizeLimit: MAX_SCREENSHOT_BYTES,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"]
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function saveDanmuScreenshot(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const returnTo = safeReturnTo(formData.get("return_to"));
  const screenshotUrl = parseOptionalText(formData.get("screenshot_url"));
  const screenshotFile = formData.get("screenshot_file");
  let status: "success" | "error" = "success";
  let message = "Screenshot salvato correttamente.";

  try {
    await requireEditSession();

    if (!id) {
      throw new Error("Danmu mancante.");
    }

    const supabase = createServerSupabaseClient();

    if (!supabase) {
      throw new Error("Client Supabase non disponibile.");
    }

    const updates: {
      screenshot_url?: string | null;
      screenshot_storage_path?: string | null;
    } = {};

    if (screenshotFile instanceof File && screenshotFile.size > 0) {
      if (!screenshotFile.type.startsWith("image/")) {
        throw new Error("Il file deve essere un'immagine.");
      }

      if (screenshotFile.size > MAX_SCREENSHOT_BYTES) {
        throw new Error("L'immagine supera il limite di 8MB.");
      }

      await ensureScreenshotBucket(supabase);
      const extension = getScreenshotExtension(screenshotFile);
      const storagePath = `${id}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from(DANMU_SCREENSHOT_BUCKET)
        .upload(storagePath, screenshotFile, {
          contentType: screenshotFile.type || "image/jpeg",
          upsert: true
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      updates.screenshot_storage_path = storagePath;
      updates.screenshot_url = screenshotUrl;
    } else if (screenshotUrl) {
      updates.screenshot_url = screenshotUrl;
    } else {
      throw new Error("Inserisci un link immagine o carica un file.");
    }

    const { error } = await supabase.from("danmu").update(updates).eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/danmu");
    revalidatePath("/admin");
  } catch (error) {
    status = "error";
    message = getErrorMessage(error);
  }

  danmuRedirect(returnTo, status, message);
}
