import Link from "next/link";
import { type PublicSerie } from "@/lib/supabase";
import { createServerSupabaseClient, hasServerSupabaseConfig } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

type SerieWithCount = PublicSerie & {
  episodi_count: number;
};

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

export default async function SeriePage() {
  const { serie, error } = await getSerie();

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

      {!error && serie.length === 0 ? (
        <div className="rounded-md border border-stone-200 bg-white p-5 text-sm text-stone-700">
          Non ci sono ancora serie disponibili.
        </div>
      ) : null}

      {serie.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(serie as SerieWithCount[]).map((item) => (
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
                  {item.genere ? (
                    <div>
                      <dt className="font-medium text-ink">Genere</dt>
                      <dd className="mt-1">{item.genere}</dd>
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
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
