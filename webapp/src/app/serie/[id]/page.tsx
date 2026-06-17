import Link from "next/link";
import {
  type PublicEpisodio,
  type PublicPersonaggio,
  type PublicSerie
} from "@/lib/supabase";
import { createServerSupabaseClient, hasServerSupabaseConfig } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

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
    />
  );
}

function CharacterImage({ personaggio }: { personaggio: PublicPersonaggio }) {
  if (!personaggio.immagine_rappresentativa) {
    return (
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-stone-100 text-base font-semibold text-stone-500">
        {personaggio.nome_originale.slice(0, 1)}
      </div>
    );
  }

  return (
    <img
      src={personaggio.immagine_rappresentativa}
      alt={personaggio.nome_originale}
      className="h-14 w-14 shrink-0 rounded-md object-cover"
      loading="lazy"
    />
  );
}

function seasonLabel(stagione: number | null) {
  return stagione ? `Stagione ${stagione}` : "Senza stagione";
}

function groupEpisodesBySeason(episodes: PublicEpisodio[]) {
  const groups = new Map<number | null, PublicEpisodio[]>();

  for (const episode of episodes) {
    const key = episode.stagione ?? null;
    groups.set(key, [...(groups.get(key) ?? []), episode]);
  }

  return [...groups.entries()].sort(([a], [b]) => (a ?? 0) - (b ?? 0));
}

async function getSerieDetail(id: string) {
  const supabase = createServerSupabaseClient();

  if (!hasServerSupabaseConfig() || !supabase) {
    return {
      serie: null,
      episodi: [],
      personaggi: [],
      error: "Configurazione Supabase server mancante. Controlla SUPABASE_SERVICE_ROLE_KEY e riavvia npm run dev."
    };
  }

  try {
    const { data: serie, error: serieError } = await supabase
      .from("public_serie_tv")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (serieError) {
      return { serie: null, episodi: [], personaggi: [], error: serieError.message };
    }

    const [
      { data: episodi, error: episodiError },
      { data: personaggi, error: personaggiError }
    ] = await Promise.all([
      supabase
        .from("public_episodi")
        .select("*")
        .eq("serie_id", id)
        .order("stagione", { ascending: true })
        .order("numero_episodio", { ascending: true }),
      supabase
        .from("public_personaggi")
        .select("*")
        .eq("serie_id", id)
        .order("nome_originale", { ascending: true })
    ]);

    if (episodiError) {
      return { serie: null, episodi: [], personaggi: [], error: episodiError.message };
    }

    if (personaggiError) {
      return { serie: null, episodi: [], personaggi: [], error: personaggiError.message };
    }

    return {
      serie: serie as PublicSerie | null,
      episodi: (episodi ?? []) as PublicEpisodio[],
      personaggi: (personaggi ?? []) as PublicPersonaggio[],
      error: null
    };
  } catch (unknownError) {
    const message =
      unknownError instanceof Error
        ? unknownError.message
        : "Errore sconosciuto durante il caricamento della serie.";

    return { serie: null, episodi: [], personaggi: [], error: message };
  }
}

export default async function SerieDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { serie, episodi, personaggi, error } = await getSerieDetail(id);
  const episodeGroups = groupEpisodesBySeason(episodi);
  const hasMultipleSeasons = episodeGroups.length > 1;

  if (error) {
    return (
      <section>
        <Link href="/serie" className="text-sm font-medium text-cinnabar hover:text-ink">
          Torna alle serie
        </Link>
        <div className="mt-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Impossibile caricare la serie: {error}
        </div>
      </section>
    );
  }

  if (!serie) {
    return (
      <section>
        <Link href="/serie" className="text-sm font-medium text-cinnabar hover:text-ink">
          Torna alle serie
        </Link>
        <div className="mt-6 rounded-md border border-stone-200 bg-white p-5 text-sm text-stone-700">
          Serie non trovata o non pubblica.
        </div>
      </section>
    );
  }

  return (
    <section className="grid gap-8">
      <div className="grid gap-6 lg:grid-cols-[220px_1fr] lg:items-start">
        <SeriePoster serie={serie} />
        <div>
          <Link href="/serie" className="text-sm font-medium text-cinnabar hover:text-ink">
            Torna alle serie
          </Link>
          <h1 className="mt-4 text-3xl font-semibold text-ink">{serie.titolo_originale}</h1>
          {serie.titolo_inglese ? <p className="mt-2 text-stone-600">{serie.titolo_inglese}</p> : null}
          {serie.descrizione ? <p className="mt-5 max-w-3xl leading-7 text-stone-700">{serie.descrizione}</p> : null}
          <dl className="mt-6 grid gap-4 text-sm text-stone-700 sm:grid-cols-2 lg:grid-cols-4">
            {serie.anno ? (
              <div>
                <dt className="font-medium text-ink">Anno</dt>
                <dd className="mt-1">{serie.anno}</dd>
              </div>
            ) : null}
            {serie.genere ? (
              <div>
                <dt className="font-medium text-ink">Genere</dt>
                <dd className="mt-1">{serie.genere}</dd>
              </div>
            ) : null}
            {serie.piattaforma ? (
              <div>
                <dt className="font-medium text-ink">Piattaforma</dt>
                <dd className="mt-1">{serie.piattaforma}</dd>
              </div>
            ) : null}
            {serie.tipo_distribuzione ? (
              <div>
                <dt className="font-medium text-ink">Distribuzione</dt>
                <dd className="mt-1">{serie.tipo_distribuzione}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      </div>

      <details className="rounded-md border border-stone-200 bg-white" open>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-xl font-semibold text-ink marker:hidden">
          <span>Personaggi</span>
          <span className="rounded-sm bg-stone-100 px-2 py-1 text-xs font-medium text-stone-600">{personaggi.length}</span>
        </summary>
        {personaggi.length > 0 ? (
          <div className="grid gap-3 border-t border-stone-200 p-4 md:grid-cols-2">
            {personaggi.map((personaggio) => (
              <article key={personaggio.id} className="grid gap-3 rounded-md border border-stone-200 p-3">
                <div className="flex gap-3">
                  <CharacterImage personaggio={personaggio} />
                  <div className="min-w-0">
                    <h3 className="font-semibold text-ink">{personaggio.nome_originale}</h3>
                    {personaggio.nome_pinyin ? (
                      <p className="mt-1 text-xs text-stone-500">{personaggio.nome_pinyin}</p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-stone-600">
                      {personaggio.genere ? <span className="rounded-sm bg-stone-100 px-2 py-1">{personaggio.genere}</span> : null}
                      {personaggio.fascia_eta ? <span className="rounded-sm bg-stone-100 px-2 py-1">{personaggio.fascia_eta}</span> : null}
                      {personaggio.lavoro ? <span className="rounded-sm bg-stone-100 px-2 py-1">{personaggio.lavoro}</span> : null}
                    </div>
                  </div>
                </div>
                {personaggio.descrizione ? (
                  <p className="text-sm leading-6 text-stone-700">{personaggio.descrizione}</p>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <div className="border-t border-stone-200 p-5 text-sm text-stone-700">
            Non ci sono ancora personaggi per questa serie.
          </div>
        )}
      </details>

      <details className="rounded-md border border-stone-200 bg-white" open>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-xl font-semibold text-ink marker:hidden">
          <span>Episodi</span>
          <span className="rounded-sm bg-stone-100 px-2 py-1 text-xs font-medium text-stone-600">{episodi.length}</span>
        </summary>
        <div className="grid gap-3 border-t border-stone-200 p-4">
          {episodi.length === 0 ? (
            <div className="rounded-md border border-stone-200 p-5 text-sm text-stone-700">
              Non ci sono ancora episodi per questa serie.
            </div>
          ) : hasMultipleSeasons ? (
            episodeGroups.map(([season, seasonEpisodes]) => (
              <details key={season ?? "none"} className="rounded-md border border-stone-200">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 font-semibold text-ink marker:hidden">
                  <span>{seasonLabel(season)}</span>
                  <span className="rounded-sm bg-stone-100 px-2 py-1 text-xs font-medium text-stone-600">
                    {seasonEpisodes.length} episodi
                  </span>
                </summary>
                <EpisodeList episodes={seasonEpisodes} showSeason={false} />
              </details>
            ))
          ) : (
            <EpisodeList episodes={episodi} showSeason={false} />
          )}
        </div>
      </details>
    </section>
  );
}

function EpisodeList({ episodes, showSeason }: { episodes: PublicEpisodio[]; showSeason: boolean }) {
  return (
    <div className="divide-y divide-stone-200 border-t border-stone-200">
      {episodes.map((episodio) => (
        <article key={episodio.id} className="grid gap-2 px-4 py-3 text-sm md:grid-cols-[110px_1fr_auto] md:items-center">
          <div className="flex flex-wrap gap-2 text-xs text-stone-600">
            {showSeason ? <span className="rounded-sm bg-stone-100 px-2 py-1">S{episodio.stagione ?? "-"}</span> : null}
            <span className="rounded-sm bg-stone-100 px-2 py-1">E{episodio.numero_episodio ?? "-"}</span>
          </div>
          <Link href={`/episodi/${episodio.id}`} className="font-medium text-ink hover:text-cinnabar">
            {episodio.titolo_originale ?? "Senza titolo"}
          </Link>
          <span className="text-stone-600">{episodio.messa_in_onda ?? ""}</span>
        </article>
      ))}
    </div>
  );
}
