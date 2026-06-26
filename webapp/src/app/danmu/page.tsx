import Link from "next/link";
import { Plus } from "lucide-react";
import { getAdminSession } from "@/app/access-actions";
import { Pagination } from "@/components/pagination";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { QuickAdminActions } from "@/components/quick-admin-actions";
import { getPagination, parsePage, type PaginationState } from "@/lib/pagination";
import { type PublicDanmu, type PublicSerie } from "@/lib/supabase";
import { createServerSupabaseClient, hasServerSupabaseConfig } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

type SearchParams = {
  q?: string;
  serie?: string;
  emozione?: string;
  episodio?: string;
  page?: string;
  status?: string;
  message?: string;
};

type OptionData = {
  serie: PublicSerie[];
  emozioni: string[];
  episodi: number[];
};

const emptyOptions: OptionData = {
  serie: [],
  emozioni: [],
  episodi: []
};

type DanmuNotice = {
  status: "success" | "error";
  message: string;
};

function getValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function getNotice(params: Record<string, string | string[] | undefined>): DanmuNotice | null {
  const status = getValue(params.status);
  const message = getValue(params.message);

  if ((status !== "success" && status !== "error") || !message) {
    return null;
  }

  return { status, message };
}

function Notice({ notice }: { notice: DanmuNotice }) {
  const isSuccess = notice.status === "success";

  return (
    <div
      className={`rounded-md border p-4 text-sm ${
        isSuccess
          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
          : "border-red-200 bg-red-50 text-red-900"
      }`}
      role={isSuccess ? "status" : "alert"}
    >
      <span className="font-semibold">{isSuccess ? "Operazione completata." : "Operazione non riuscita."}</span>{" "}
      {notice.message}
    </div>
  );
}

function formatTime(seconds: number | null) {
  if (seconds === null) {
    return null;
  }

  const roundedSeconds = Math.floor(seconds);
  const minutes = Math.floor(roundedSeconds / 60);
  const remainingSeconds = roundedSeconds % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

async function getOptions() {
  const supabase = createServerSupabaseClient();

  if (!hasServerSupabaseConfig() || !supabase) {
    return emptyOptions;
  }

  const [{ data: serie }, { data: danmu }] = await Promise.all([
    supabase.from("public_serie_tv").select("id,titolo_originale").order("titolo_originale", { ascending: true }),
    supabase.from("public_danmu").select("emozioni,numero_episodio").limit(1000)
  ]);

  const emozioni = new Set<string>();
  const episodi = new Set<number>();

  for (const item of danmu ?? []) {
    for (const emozione of item.emozioni ?? []) {
      emozioni.add(emozione);
    }
    if (item.numero_episodio) {
      episodi.add(item.numero_episodio);
    }
  }

  return {
    serie: (serie ?? []) as PublicSerie[],
    emozioni: [...emozioni].sort((a, b) => a.localeCompare(b, "it")),
    episodi: [...episodi].sort((a, b) => a - b)
  };
}

async function getDanmu(filters: SearchParams, pagination: PaginationState) {
  const supabase = createServerSupabaseClient();

  if (!hasServerSupabaseConfig() || !supabase) {
    return {
      danmu: [],
      total: 0,
      options: emptyOptions,
      error: "Configurazione Supabase server mancante. Controlla SUPABASE_SERVICE_ROLE_KEY e riavvia npm run dev."
    };
  }

  const q = filters.q?.trim();
  const serie = filters.serie?.trim();
  const emozione = filters.emozione?.trim();
  const episodio = Number(filters.episodio);

  try {
    const options = await getOptions();
    let query = supabase
      .from("public_danmu")
      .select("*", { count: "exact" })
      .order("serie_titolo_originale", { ascending: true })
      .order("numero_episodio", { ascending: true, nullsFirst: false })
      .order("timecode_secondi", { ascending: true, nullsFirst: false })
      .range(pagination.from, pagination.to);

    if (q) {
      query = query.or(`testo_originale.ilike.%${q}%,testo_pinyin.ilike.%${q}%,traduzione_italiana.ilike.%${q}%`);
    }

    if (serie) {
      query = query.eq("serie_id", serie);
    }

    if (emozione) {
      query = query.contains("emozioni", [emozione]);
    }

    if (Number.isFinite(episodio) && episodio > 0) {
      query = query.eq("numero_episodio", episodio);
    }

    const { data, error, count } = await query;

    if (error) {
      return { danmu: [], total: 0, options, error: error.message };
    }

    return {
      danmu: (data ?? []) as PublicDanmu[],
      total: count ?? 0,
      options,
      error: null
    };
  } catch (unknownError) {
    const message =
      unknownError instanceof Error
        ? unknownError.message
        : "Errore sconosciuto durante il caricamento dei Danmu.";

    return { danmu: [], total: 0, options: emptyOptions, error: message };
  }
}

export default async function DanmuPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filters = {
    q: getValue(params.q),
    serie: getValue(params.serie),
    emozione: getValue(params.emozione),
    episodio: getValue(params.episodio)
  };
  const page = parsePage(params.page);
  const pagination = getPagination(page, 50);
  const notice = getNotice(params);
  const session = await getAdminSession();
  const { danmu, total, options, error } = await getDanmu(filters, pagination);
  const returnParams = new URLSearchParams();

  if (filters.q) returnParams.set("q", filters.q);
  if (filters.serie) returnParams.set("serie", filters.serie);
  if (filters.emozione) returnParams.set("emozione", filters.emozione);
  if (filters.episodio) returnParams.set("episodio", filters.episodio);
  if (page > 1) returnParams.set("page", String(page));

  const returnTo = `/danmu${returnParams.toString() ? `?${returnParams.toString()}` : ""}`;

  return (
    <section className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Danmu</h1>
          <p className="mt-3 text-stone-700">
            Commenti Danmu selezionati, sincronizzati agli episodi e pubblicati per la consultazione.
          </p>
        </div>
        {session?.canEdit ? (
          <Link
            href="/admin?tab=danmu"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-cinnabar px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            <Plus size={16} aria-hidden="true" />
            Aggiungi nuovo Danmu
          </Link>
        ) : null}
      </div>

      <form className="grid gap-3 rounded-md border border-stone-200 bg-white p-4 md:grid-cols-4" action="/danmu">
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-ink">Ricerca</span>
          <input
            name="q"
            defaultValue={filters.q}
            className="rounded-md border border-stone-300 px-3 py-2 text-stone-900 outline-none focus:border-cinnabar"
            placeholder="Commento, pinyin, traduzione"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-ink">Serie</span>
          <select
            name="serie"
            defaultValue={filters.serie}
            className="rounded-md border border-stone-300 px-3 py-2 text-stone-900 outline-none focus:border-cinnabar"
          >
            <option value="">Tutte</option>
            {options.serie.map((serie) => (
              <option key={serie.id} value={serie.id}>
                {serie.titolo_originale}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-ink">Episodio</span>
          <select
            name="episodio"
            defaultValue={filters.episodio}
            className="rounded-md border border-stone-300 px-3 py-2 text-stone-900 outline-none focus:border-cinnabar"
          >
            <option value="">Tutti</option>
            {options.episodi.map((episodio) => (
              <option key={episodio} value={episodio}>
                Ep. {episodio}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-ink">Emozione</span>
          <select
            name="emozione"
            defaultValue={filters.emozione}
            className="rounded-md border border-stone-300 px-3 py-2 text-stone-900 outline-none focus:border-cinnabar"
          >
            <option value="">Tutte</option>
            {options.emozioni.map((emozione) => (
              <option key={emozione} value={emozione}>
                {emozione}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end gap-3 md:col-span-4">
          <PendingSubmitButton
            pendingText="Ricerca..."
            className="inline-flex items-center justify-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-cinnabar disabled:cursor-wait disabled:bg-ink/70"
          >
            Cerca
          </PendingSubmitButton>
          <a href="/danmu" className="px-2 py-2 text-sm font-medium text-cinnabar hover:text-ink">
            Azzera
          </a>
        </div>
      </form>

      {notice ? <Notice notice={notice} /> : null}

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Impossibile caricare i Danmu: {error}
        </div>
      ) : null}

      {!error && danmu.length === 0 ? (
        <div className="rounded-md border border-stone-200 bg-white p-5 text-sm text-stone-700">
          Nessun Danmu pubblico trovato con questi filtri.
        </div>
      ) : null}

      {danmu.length > 0 ? (
        <div className="grid gap-4">
          <Pagination
            basePath="/danmu"
            page={page}
            perPage={pagination.perPage}
            total={total}
            params={filters}
            itemLabel="Danmu"
          />
          {danmu.map((item) => (
            <article key={item.id} className="rounded-md border border-stone-200 bg-white p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-wrap gap-2 text-xs text-stone-600">
                  <span className="rounded-sm bg-stone-100 px-2 py-1">{item.serie_titolo_originale}</span>
                  {item.numero_episodio ? (
                    <span className="rounded-sm bg-stone-100 px-2 py-1">Ep. {item.numero_episodio}</span>
                  ) : null}
                  {formatTime(item.timecode_secondi) ? (
                    <span className="rounded-sm bg-stone-100 px-2 py-1">{formatTime(item.timecode_secondi)}</span>
                  ) : null}
                  {item.piattaforma ? <span className="rounded-sm bg-stone-100 px-2 py-1">{item.piattaforma}</span> : null}
                  {item.like_ricevuti ? (
                    <span className="rounded-sm bg-stone-100 px-2 py-1">{item.like_ricevuti} like</span>
                  ) : null}
                </div>
                {session?.canEdit ? (
                  <QuickAdminActions
                    resource="danmu"
                    id={item.id}
                    title={item.testo_originale}
                    returnTo={returnTo}
                    fields={[
                      { name: "testo_originale", label: "Testo originale", type: "textarea", value: item.testo_originale },
                      { name: "testo_pinyin", label: "Pinyin", type: "textarea", value: item.testo_pinyin },
                      { name: "traduzione_italiana", label: "Traduzione italiana", type: "textarea", value: item.traduzione_italiana },
                      { name: "sentiment", label: "Sentiment", value: item.sentiment },
                      { name: "nota_analisi", label: "Nota analisi", type: "textarea", value: item.nota_analisi }
                    ]}
                  />
                ) : null}
              </div>
              <h2 className="mt-4 text-lg font-semibold leading-7 text-ink">{item.testo_originale}</h2>
              {item.testo_pinyin ? <p className="mt-2 text-sm text-stone-600">{item.testo_pinyin}</p> : null}
              {item.traduzione_italiana ? (
                <p className="mt-3 leading-7 text-stone-700">{item.traduzione_italiana}</p>
              ) : null}
              {item.emozioni.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  {item.emozioni.map((emozione) => (
                    <span key={emozione} className="rounded-sm border border-cinnabar/30 px-2 py-1 text-cinnabar">
                      {emozione}
                    </span>
                  ))}
                </div>
              ) : null}
              {item.nota_analisi ? (
                <p className="mt-4 border-l-2 border-stone-200 pl-3 text-sm leading-6 text-stone-600">
                  {item.nota_analisi}
                </p>
              ) : null}
            </article>
          ))}
          <Pagination
            basePath="/danmu"
            page={page}
            perPage={pagination.perPage}
            total={total}
            params={filters}
            itemLabel="Danmu"
          />
        </div>
      ) : null}
    </section>
  );
}
