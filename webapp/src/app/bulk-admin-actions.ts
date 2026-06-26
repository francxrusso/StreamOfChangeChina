"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireEditSession } from "@/app/access-actions";
import { normalizeCharacterGender } from "@/lib/character-genders";
import { maybeGeneratePinyin } from "@/lib/pinyin";
import { formatSerieGenres } from "@/lib/serie-genres";
import { createSupabaseAdminClient } from "@/lib/supabase";

type BulkValue = string | number | boolean | null;

function safeReturnTo(value: FormDataEntryValue | null) {
  const returnTo = typeof value === "string" ? value : "/";
  return returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/";
}

function redirectWithNotice(returnTo: string, status: "success" | "error", message: string): never {
  const separator = returnTo.includes("?") ? "&" : "?";
  redirect(`${returnTo}${separator}status=${status}&message=${encodeURIComponent(message)}`);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Errore sconosciuto durante l'operazione.";
}

function parseIds(formData: FormData) {
  return formData
    .getAll("selected_ids")
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);
}

function parseText(formData: FormData, field: string) {
  const value = formData.get(field);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseNumber(formData: FormData, field: string) {
  const value = parseText(formData, field);
  if (!value) {
    return null;
  }

  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) ? number : null;
}

function parseRowText(formData: FormData, field: string, id: string) {
  const value = formData.get(`${field}_${id}`);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseRowNumber(formData: FormData, field: string, id: string) {
  const value = parseRowText(formData, field, id);
  if (!value) {
    return null;
  }

  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) ? number : null;
}

function addPayloadValue(payload: Record<string, BulkValue>, field: string, value: BulkValue) {
  if (value !== null && value !== "") {
    payload[field] = value;
  }
}

async function updateMany(table: string, ids: string[], payload: Record<string, BulkValue>) {
  if (Object.keys(payload).length === 0) {
    return 0;
  }

  const supabase = createSupabaseAdminClient();
  const { error, count } = await supabase.from(table).update(payload, { count: "exact" }).in("id", ids);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

function revalidateBulk(returnTo: string) {
  revalidatePath("/serie");
  revalidatePath("/admin");

  if (returnTo.startsWith("/serie/")) {
    revalidatePath(returnTo.split("?")[0]);
  }
}

export async function bulkUpdateSeries(formData: FormData) {
  const returnTo = safeReturnTo(formData.get("return_to"));
  let status: "success" | "error" = "success";
  let message = "Serie aggiornate correttamente.";

  try {
    await requireEditSession();
    const ids = parseIds(formData);

    if (ids.length === 0) {
      throw new Error("Seleziona almeno una serie.");
    }

    const payload: Record<string, BulkValue> = {};
    addPayloadValue(payload, "visibility", parseText(formData, "visibility"));
    const gestionePersonaggi = parseText(formData, "gestione_personaggi");
    if (gestionePersonaggi === "true") {
      payload.gestione_personaggi = true;
    }
    if (gestionePersonaggi === "false") {
      payload.gestione_personaggi = false;
    }
    addPayloadValue(payload, "piattaforma", parseText(formData, "piattaforma"));
    addPayloadValue(payload, "tipo_distribuzione", parseText(formData, "tipo_distribuzione"));

    const genres = formData
      .getAll("genere")
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim())
      .filter(Boolean);

    if (genres.length > 0) {
      payload.genere = formatSerieGenres(genres);
    }

    const count = await updateMany("serie_tv", ids, payload);

    if (count === 0) {
      throw new Error("Nessuna serie aggiornata. Seleziona almeno un campo da modificare.");
    }

    revalidateBulk(returnTo);
    message = `${count} serie aggiornate correttamente.`;
  } catch (error) {
    status = "error";
    message = getErrorMessage(error);
  }

  redirectWithNotice(returnTo, status, message);
}

export async function bulkUpdateEpisodes(formData: FormData) {
  const returnTo = safeReturnTo(formData.get("return_to"));
  let status: "success" | "error" = "success";
  let message = "Episodi aggiornati correttamente.";

  try {
    await requireEditSession();
    const ids = parseIds(formData);

    if (ids.length === 0) {
      throw new Error("Seleziona almeno un episodio.");
    }

    const payload: Record<string, BulkValue> = {};
    addPayloadValue(payload, "visibility", parseText(formData, "visibility"));
    addPayloadValue(payload, "stagione", parseNumber(formData, "stagione"));
    addPayloadValue(payload, "messa_in_onda", parseText(formData, "messa_in_onda"));

    const updatedCount = await updateMany("episodi", ids, payload);
    let pinyinCount = 0;

    if (formData.get("rigenera_pinyin") === "true") {
      const supabase = createSupabaseAdminClient();
      const { data, error } = await supabase.from("episodi").select("id,titolo_originale").in("id", ids);

      if (error) {
        throw new Error(error.message);
      }

      for (const episode of data ?? []) {
        const titoloPinyin = maybeGeneratePinyin(null, episode.titolo_originale);

        if (!titoloPinyin) {
          continue;
        }

        const { error: updateError } = await supabase
          .from("episodi")
          .update({ titolo_pinyin: titoloPinyin })
          .eq("id", episode.id);

        if (updateError) {
          throw new Error(updateError.message);
        }

        pinyinCount += 1;
      }
    }

    if (updatedCount === 0 && pinyinCount === 0) {
      throw new Error("Nessun episodio aggiornato. Seleziona almeno un campo da modificare.");
    }

    revalidateBulk(returnTo);
    message = `${updatedCount + pinyinCount} aggiornamenti applicati agli episodi selezionati.`;
  } catch (error) {
    status = "error";
    message = getErrorMessage(error);
  }

  redirectWithNotice(returnTo, status, message);
}

export async function bulkUpdateEpisodeRows(formData: FormData) {
  const returnTo = safeReturnTo(formData.get("return_to"));
  let status: "success" | "error" = "success";
  let message = "Episodi aggiornati correttamente.";

  try {
    await requireEditSession();
    const ids = formData
      .getAll("episode_ids")
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim())
      .filter(Boolean);

    if (ids.length === 0) {
      throw new Error("Seleziona almeno un episodio.");
    }

    const supabase = createSupabaseAdminClient();
    let updatedCount = 0;

    for (const id of ids) {
      const titoloOriginale = parseRowText(formData, "titolo_originale", id);
      const titoloPinyin = maybeGeneratePinyin(parseRowText(formData, "titolo_pinyin", id), titoloOriginale);

      const payload: Record<string, BulkValue> = {
        visibility: parseRowText(formData, "visibility", id),
        stagione: parseRowNumber(formData, "stagione", id),
        numero_episodio: parseRowNumber(formData, "numero_episodio", id),
        titolo_originale: titoloOriginale,
        titolo_pinyin: titoloPinyin,
        titolo_italiano: parseRowText(formData, "titolo_italiano", id),
        messa_in_onda: parseRowText(formData, "messa_in_onda", id),
        durata_secondi: parseRowNumber(formData, "durata_secondi", id),
        link_episodio: parseRowText(formData, "link_episodio", id),
        trascrizione: parseRowText(formData, "trascrizione", id),
        sintesi_automatica: parseRowText(formData, "sintesi_automatica", id),
        analisi_tematica_parole: parseRowText(formData, "analisi_tematica_parole", id),
        analisi_emozioni: parseRowText(formData, "analisi_emozioni", id),
        analisi_tematica_emotiva: parseRowText(formData, "analisi_tematica_emotiva", id),
        descrizione: parseRowText(formData, "descrizione", id)
      };

      const { error } = await supabase.from("episodi").update(payload).eq("id", id);

      if (error) {
        throw new Error(error.message);
      }

      updatedCount += 1;
      revalidatePath(`/episodi/${id}`);
    }

    revalidateBulk(returnTo);
    message = `${updatedCount} episodi aggiornati dalla vista tabellare.`;
  } catch (error) {
    status = "error";
    message = getErrorMessage(error);
  }

  redirectWithNotice(returnTo, status, message);
}

export async function bulkUpdateCharacters(formData: FormData) {
  const returnTo = safeReturnTo(formData.get("return_to"));
  let status: "success" | "error" = "success";
  let message = "Personaggi aggiornati correttamente.";

  try {
    await requireEditSession();
    const ids = parseIds(formData);

    if (ids.length === 0) {
      throw new Error("Seleziona almeno un personaggio.");
    }

    const payload: Record<string, BulkValue> = {};
    addPayloadValue(payload, "visibility", parseText(formData, "visibility"));
    addPayloadValue(payload, "genere", normalizeCharacterGender(parseText(formData, "genere")));
    addPayloadValue(payload, "fascia_eta", parseText(formData, "fascia_eta"));
    addPayloadValue(payload, "lavoro", parseText(formData, "lavoro"));

    const count = await updateMany("personaggi", ids, payload);

    if (count === 0) {
      throw new Error("Nessun personaggio aggiornato. Seleziona almeno un campo da modificare.");
    }

    revalidateBulk(returnTo);
    message = `${count} personaggi aggiornati correttamente.`;
  } catch (error) {
    status = "error";
    message = getErrorMessage(error);
  }

  redirectWithNotice(returnTo, status, message);
}
