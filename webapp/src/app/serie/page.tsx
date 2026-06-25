import Link from "next/link";
import { getAdminSession } from "@/app/access-actions";
import { QuickAdminActions } from "@/components/quick-admin-actions";
import { type PublicSerie } from "@/lib/supabase";
import { createServerSupabaseClient, hasServerSupabaseConfig } from "@/lib/supabase-server";
import { SERIE_GENRE_OPTIONS, getSerieGenreLabel, splitSerieGenres } from "@/lib/serie-genres";

export const dynamic = "force-dynamic";

type SerieWithCount = PublicSerie & {
  episodi_count: number;
};

type NoticeData = {
  status: "success" | "error";
  message: string;
};

type SerieFilters = {
  q: string;
  genere: string;
};

function getValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function getNotice(params: Record<string, string | string[] | undefined>): NoticeData | null {
  const status = getValue(params.status);
  const message = getValue(params.message);

  if ((status !== "success" && status !== "error") || !message) {
    return null;
  }

  return { status, message };
}

function Notice({ notice }: { notice: NoticeData }) {
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

function SeriePoster({ serie }: { serie: PublicSerie }) {
  if (!serie.poster_url) {
    return (
      <div className="flex aspect-[2/3] w-full items-center justify-center rounded-md bg-stone-100 text-sm text-stone-500">
        Poster non disponibile
      </div>
    );
  }

  return (
    <img
      src={serie.poster_url}
      alt={`Poster ${serie.titolo_originale}`}
      className="aspect-[2/3] w-full rounded-md object-cover"
      loading="lazy"
    />
  );
}

function matchesSerieFilters(serie: PublicSerie, filters: SerieFilters) {
  const query = filters.q.trim().toLowerCase();
  const genre = filters.genere.trim();
  const genres = splitSerieGenres(serie.genere);
  const matchesQuery =
    !query ||
    [
      serie.titolo_originale,
      serie.titolo_pinyin,
      serie.titolo_italiano,
      serie.titolo_inglese,
      serie.descrizione,
      serie.piattaforma
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  const matchesGenre = !genre || genres.includes(genre);

  return matchesQuery && matchesGenre;
}

function SerieFiltersForm({ filters }: { filters: SerieFilters }) {
  return (
    <form action="/serie" className="grid gap-3 rounded-md border border-stone-200 bg-white p-4 md:grid-cols-[minmax(0,1fr)_16rem_auto] md:items-end">
      <label className="grid gap-1 text-sm">
        <span className="font-medium text-ink">Cerca</span>
        <input
          name="q"
          defaultValue={filters.q}
          placeholder="Titolo, piattaforma, descrizione"
          className="rounded-md border border-stone-300 px-3 py-2 text-stone-900 outline-none focus:border-cinnabar"
        />
      </label>
      <label className="grid gap-1 text-sm">
        <span className="font-medium text-ink">Genere</span>
        <select
          name="genere"
          defaultValue={filters.genere}
          className="rounded-md border border-stone-300 px-3 py-2 text-stone-900 outline-none focus:border-cinnabar"
        >
          <option value="">Tutti</option>
          {SERIE_GENRE_OPTIONS.map((genre) => (
            <option key={genre.value} value={genre.value}>
              {getSerieGenreLabel(genre.value)}
            </option>
          ))}
        </select>
      </label>
      <div className="flex gap-2">
        <button type="submit" className="rounded-md bg-cinnabar px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">
          Filtra
        </button>
        <Link href="/serie" className="rounded-md border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 hover:border-cinnabar hover:text-cinnabar">
          Reset
        </Link>
      </div>
    </form>
  );
}

async function getSerie() {
  const supabase = createServerSupabaseClient();

  if (!hasServerSupabaseConfig() || !supabase) {
    return {
      serie: [],
      error: "Configurazione Supabase server mancante. Controlla SUPABASE_SERVICE_ROLE_KEY e riavvia npm run dev."
    };
  }

  try {
    const { data, error } = await supabase
      .from("public_serie_tv")
      .select("*")
      .order("titolo_originale", { ascending: true });

    if (error) {
      return { serie: [], error: error.message };
    }

    const { data: episodi, error: episodiError } = await supabase
      .from("public_episodi")
      .select("serie_id");

    if (episodiError) {
      return { serie: [], error: episodiError.message };
    }

    const counts = new Map<string, number>();
    for (const episodio of episodi ?? []) {
      counts.set(episodio.serie_id, (counts.get(episodio.serie_id) ?? 0) + 1);
    }

    const serieWithCounts = ((data ?? []) as PublicSerie[]).map((item) => ({
      ...item,
      episodi_count: counts.get(item.id) ?? 0
    }));

    return { serie: serieWithCounts, error: null };
  } catch (unknownError) {
    const message =
      unknownError instanceof Error
        ? unknownError.message
        : "Errore sconosciuto durante il caricamento delle serie.";

    return { serie: [], error: message };
  }
}

export default async function SeriePage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const session = await getAdminSession();
  const notice = getNotice(params);
  const filters = {
    q: getValue(params.q).trim(),
    genere: getValue(params.genere).trim()
  };
  const { serie, error } = await getSerie();
  const filteredSerie = (serie as SerieWithCount[]).filter((item) => matchesSerieFilters(item, filters));

  return (
    <section className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Serie TV</h1>
        <p className="mt-3 text-stone-700">Catalogo riservato delle serie incluse nel corpus.</p>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Impossibile caricare le serie: {error}
        </div>
      ) : null}

      {notice ? <Notice notice={notice} /> : null}

      {!error ? <SerieFiltersForm filters={filters} /> : null}

      {!error && serie.length === 0 ? (
        <div className="rounded-md border border-stone-200 bg-white p-5 text-sm text-stone-700">
          Non ci sono ancora serie disponibili.
        </div>
      ) : null}

      {!error && serie.length > 0 && filteredSerie.length === 0 ? (
        <div className="rounded-md border border-stone-200 bg-white p-5 text-sm text-stone-700">
          Nessuna serie corrisponde ai filtri selezionati.
        </div>
      ) : null}

      {filteredSerie.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredSerie.map((item) => (
            <article key={item.id} className="overflow-hidden rounded-md border border-stone-200 bg-white hover:border-cinnabar">
              <Link href={`/serie/${item.id}`} className="block">
                <SeriePoster serie={item} />
              </Link>
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-ink">
                      <Link href={`/serie/${item.id}`} className="hover:text-cinnabar">
                        {item.titolo_originale}
                      </Link>
                    </h2>
                    {item.titolo_inglese ? (
                      <p className="mt-1 text-sm text-stone-600">{item.titolo_inglese}</p>
                    ) : null}
                  </div>
                  {item.anno ? (
                    <span className="rounded-sm bg-stone-100 px-2 py-1 text-xs text-stone-700">
                      {item.anno}
                    </span>
                  ) : null}
                </div>

                {item.descrizione ? (
                  <p className="mt-4 line-clamp-4 text-sm leading-6 text-stone-700">{item.descrizione}</p>
                ) : null}

                <dl className="mt-5 grid gap-3 text-sm text-stone-700 sm:grid-cols-2">
                  {splitSerieGenres(item.genere).length > 0 ? (
                    <div>
                      <dt className="font-medium text-ink">Genere</dt>
                      <dd className="mt-2 flex flex-wrap gap-1.5">
                        {splitSerieGenres(item.genere).map((genre) => (
                          <span key={genre} className="rounded-sm bg-stone-100 px-2 py-1 text-xs text-stone-700">
                            {getSerieGenreLabel(genre)}
                          </span>
                        ))}
                      </dd>
                    </div>
                  ) : null}
                  {item.stagioni ? (
                    <div>
                      <dt className="font-medium text-ink">Stagioni</dt>
                      <dd className="mt-1">{item.stagioni}</dd>
                    </div>
                  ) : null}
                  <div>
                    <dt className="font-medium text-ink">Episodi</dt>
                    <dd className="mt-1">{item.episodi_count}</dd>
                  </div>
                  {item.piattaforma ? (
                    <div>
                      <dt className="font-medium text-ink">Piattaforma</dt>
                      <dd className="mt-1">{item.piattaforma}</dd>
                    </div>
                  ) : null}
                </dl>
                <Link
                  href={`/serie/${item.id}`}
                  className="mt-5 inline-flex text-sm font-medium text-cinnabar hover:text-ink"
                >
                  Apri episodi
                </Link>
                {session?.canEdit ? (
                  <div className="mt-5 border-t border-stone-100 pt-4">
                    <QuickAdminActions
                      resource="serie"
                      id={item.id}
                      title={item.titolo_originale}
                      returnTo="/serie"
                      fields={[
                        { name: "titolo_originale", label: "Titolo originale", value: item.titolo_originale },
                        { name: "titolo_pinyin", label: "Titolo pinyin", value: item.titolo_pinyin },
                        { name: "titolo_inglese", label: "Titolo inglese", value: item.titolo_inglese },
                        { name: "anno", label: "Anno", type: "number", value: item.anno },
                        { name: "stagioni", label: "Stagioni", type: "number", value: item.stagioni },
                        {
                          name: "genere",
                          label: "Genere",
                          type: "multiselect",
                          value: item.genere,
                          options: SERIE_GENRE_OPTIONS.map((genre) => ({
                            value: genre.value,
                            label: getSerieGenreLabel(genre.value)
                          }))
                        },
                        { name: "piattaforma", label: "Piattaforma", value: item.piattaforma },
                        { name: "poster_url", label: "Poster URL", value: item.poster_url },
                        { name: "descrizione", label: "Descrizione", type: "textarea", value: item.descrizione }
                      ]}
                    />
                  </div>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
