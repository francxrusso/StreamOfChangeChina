import Link from "next/link";
import { BarChart3, Brain, Save } from "lucide-react";
import { getAdminSession } from "@/app/access-actions";
import { createServerSupabaseClient, hasServerSupabaseConfig } from "@/lib/supabase-server";
import { analyzeTranscript, type WordStat } from "@/lib/word-analysis";
import { saveEpisodeAnalysis } from "./actions";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  serie?: string;
  genere?: string;
  episodio?: string;
  parola?: string;
}>;

type SerieOption = {
  id: string;
  titolo_originale: string;
  genere: string | null;
};

type EpisodeOption = {
  id: string;
  serie_id: string;
  stagione: number | null;
  numero_episodio: number | null;
  titolo_originale: string | null;
  trascrizione: string | null;
  serie_tv: {
    titolo_originale: string;
    genere: string | null;
  } | null;
};

type SavedAnalysis = {
  id: string;
  parola_target: string | null;
  totale_token: number;
  token_unici: number;
  occorrenze_target: number | null;
  created_at: string;
  top_parole: WordStat[];
  episodi: {
    titolo_originale: string | null;
    stagione: number | null;
    numero_episodio: number | null;
    serie_tv: {
      titolo_originale: string;
      genere: string | null;
    } | null;
  } | null;
};

function getValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

async function getAnalysisData(filters: { serie: string; genere: string; episodio: string; parola: string }) {
  const supabase = createServerSupabaseClient();

  if (!hasServerSupabaseConfig() || !supabase) {
    return {
      series: [] as SerieOption[],
      episodes: [] as EpisodeOption[],
      selectedEpisode: null as EpisodeOption | null,
      savedAnalyses: [] as SavedAnalysis[],
      error: "Configurazione Supabase server mancante."
    };
  }

  const [{ data: series, error: seriesError }, { data: episodes, error: episodesError }, { data: saved, error: savedError }] =
    await Promise.all([
      supabase.from("serie_tv").select("id,titolo_originale,genere").order("titolo_originale"),
      supabase
        .from("episodi")
        .select("id,serie_id,stagione,numero_episodio,titolo_originale,trascrizione,serie_tv(titolo_originale,genere)")
        .order("stagione", { ascending: true })
        .order("numero_episodio", { ascending: true }),
      supabase
        .from("analisi_episodi")
        .select("id,parola_target,totale_token,token_unici,occorrenze_target,created_at,top_parole,episodi(titolo_originale,stagione,numero_episodio,serie_tv(titolo_originale,genere))")
        .order("created_at", { ascending: false })
        .limit(12)
    ]);

  const firstError = seriesError ?? episodesError ?? savedError;

  if (firstError) {
    return {
      series: [] as SerieOption[],
      episodes: [] as EpisodeOption[],
      selectedEpisode: null as EpisodeOption | null,
      savedAnalyses: [] as SavedAnalysis[],
      error: firstError.message
    };
  }

  const allEpisodes = (episodes ?? []) as unknown as EpisodeOption[];
  const filteredEpisodes = allEpisodes.filter((episode) => {
    const matchesSerie = filters.serie ? episode.serie_id === filters.serie : true;
    const matchesGenre = filters.genere ? episode.serie_tv?.genere === filters.genere : true;
    return matchesSerie && matchesGenre;
  });
  const selectedEpisode =
    filteredEpisodes.find((episode) => episode.id === filters.episodio) ??
    allEpisodes.find((episode) => episode.id === filters.episodio) ??
    null;

  return {
    series: (series ?? []) as SerieOption[],
    episodes: filteredEpisodes,
    selectedEpisode,
    savedAnalyses: (saved ?? []) as unknown as SavedAnalysis[],
    error: null
  };
}

export default async function AnalysisPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getAdminSession();
  const params = await searchParams;
  const filters = {
    serie: getValue(params.serie),
    genere: getValue(params.genere),
    episodio: getValue(params.episodio),
    parola: getValue(params.parola)
  };
  const { series, episodes, selectedEpisode, savedAnalyses, error } = await getAnalysisData(filters);
  const genres = [...new Set(series.map((serie) => serie.genere).filter(Boolean) as string[])].sort((a, b) =>
    a.localeCompare(b, "it")
  );
  const preview =
    selectedEpisode?.trascrizione && filters.episodio
      ? analyzeTranscript(selectedEpisode.trascrizione, filters.parola)
      : null;

  return (
    <section className="space-y-8">
      <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <h1 className="text-3xl font-semibold text-ink">Analisi</h1>
          <p className="mt-3 max-w-3xl text-stone-700">
            Agente di analisi lessicale per estrarre frequenze, ricorrenze e parole dominanti dalle trascrizioni.
          </p>
        </div>
        <div className="rounded-lg border border-stone-200 bg-white p-4 text-sm text-stone-700">
          <span className="font-semibold text-ink">Modalita attiva:</span> frequenza parole
        </div>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>
      ) : null}

      <form action="/analisi" className="grid gap-4 rounded-lg border border-stone-200 bg-white p-5 lg:grid-cols-4">
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-ink">Serie</span>
          <select name="serie" defaultValue={filters.serie} className="rounded-md border border-stone-300 px-3 py-2 outline-none focus:border-cinnabar">
            <option value="">Tutte</option>
            {series.map((serie) => (
              <option key={serie.id} value={serie.id}>
                {serie.titolo_originale}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-ink">Genere</span>
          <select name="genere" defaultValue={filters.genere} className="rounded-md border border-stone-300 px-3 py-2 outline-none focus:border-cinnabar">
            <option value="">Tutti</option>
            {genres.map((genre) => (
              <option key={genre} value={genre}>
                {genre}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-ink">Episodio</span>
          <select name="episodio" defaultValue={filters.episodio} className="rounded-md border border-stone-300 px-3 py-2 outline-none focus:border-cinnabar">
            <option value="">Seleziona</option>
            {episodes.map((episode) => (
              <option key={episode.id} value={episode.id}>
                {episode.serie_tv?.titolo_originale} S{episode.stagione} E{episode.numero_episodio} - {episode.titolo_originale ?? "Senza titolo"}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-ink">Parola da cercare</span>
          <input
            name="parola"
            defaultValue={filters.parola}
            placeholder="es. 爱, paura, 秦明"
            className="rounded-md border border-stone-300 px-3 py-2 outline-none focus:border-cinnabar"
          />
        </label>
        <div className="flex gap-2 lg:col-span-4">
          <button type="submit" className="rounded-md bg-cinnabar px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">
            Analizza
          </button>
          <Link href="/analisi" className="rounded-md border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 hover:border-cinnabar hover:text-cinnabar">
            Reset
          </Link>
        </div>
      </form>

      {preview ? (
        <section className="grid gap-5 lg:grid-cols-[0.7fr_1.3fr]">
          <div className="rounded-lg border border-stone-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-stone-100 text-cinnabar">
                <Brain size={20} aria-hidden="true" />
              </span>
              <div>
                <h2 className="font-semibold text-ink">Anteprima agente</h2>
                <p className="text-sm text-stone-600">Risultato non ancora salvato.</p>
              </div>
            </div>
            <dl className="mt-5 grid gap-4 text-sm text-stone-700">
              <div>
                <dt className="font-medium text-ink">Token totali</dt>
                <dd className="mt-1">{preview.totaleToken}</dd>
              </div>
              <div>
                <dt className="font-medium text-ink">Token unici</dt>
                <dd className="mt-1">{preview.tokenUnici}</dd>
              </div>
              {preview.parolaTarget ? (
                <div>
                  <dt className="font-medium text-ink">Occorrenze di “{preview.parolaTarget}”</dt>
                  <dd className="mt-1">
                    {preview.occorrenzeTarget} ({preview.densitaTarget}%)
                  </dd>
                </div>
              ) : null}
            </dl>
            {session?.canEdit ? (
              <form action={saveEpisodeAnalysis} className="mt-5">
                <input type="hidden" name="episodio_id" value={filters.episodio} />
                <input type="hidden" name="parola_target" value={filters.parola} />
                <button type="submit" className="inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-cinnabar">
                  <Save size={16} aria-hidden="true" />
                  Salva analisi
                </button>
              </form>
            ) : null}
          </div>

          <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
            <div className="flex items-center gap-3 border-b border-stone-200 p-4">
              <BarChart3 size={20} className="text-cinnabar" aria-hidden="true" />
              <h2 className="font-semibold text-ink">Top parole</h2>
            </div>
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-stone-50 text-stone-700">
                <tr>
                  <th className="px-4 py-3 font-medium">Parola</th>
                  <th className="px-4 py-3 font-medium">Conteggio</th>
                  <th className="px-4 py-3 font-medium">Peso</th>
                </tr>
              </thead>
              <tbody>
                {preview.topParole.slice(0, 25).map((word) => (
                  <tr key={word.parola} className="border-t border-stone-200">
                    <td className="px-4 py-3 font-medium text-ink">{word.parola}</td>
                    <td className="px-4 py-3 text-stone-700">{word.conteggio}</td>
                    <td className="px-4 py-3 text-stone-700">{word.percentuale}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="text-xl font-semibold text-ink">Analisi salvate</h2>
        <div className="mt-4 grid gap-3">
          {savedAnalyses.length === 0 ? (
            <div className="rounded-lg border border-dashed border-stone-300 bg-white p-5 text-sm text-stone-600">
              Nessuna analisi salvata.
            </div>
          ) : (
            savedAnalyses.map((analysis) => (
              <article key={analysis.id} className="rounded-lg border border-stone-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-ink">
                      {analysis.episodi?.serie_tv?.titolo_originale} S{analysis.episodi?.stagione} E{analysis.episodi?.numero_episodio}
                    </h3>
                    <p className="mt-1 text-sm text-stone-600">{analysis.episodi?.titolo_originale ?? "Senza titolo"}</p>
                  </div>
                  <span className="text-xs text-stone-500">{formatDate(analysis.created_at)}</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-stone-600">
                  <span className="rounded-sm bg-stone-100 px-2 py-1">{analysis.totale_token} token</span>
                  <span className="rounded-sm bg-stone-100 px-2 py-1">{analysis.token_unici} unici</span>
                  {analysis.parola_target ? (
                    <span className="rounded-sm bg-stone-100 px-2 py-1">
                      {analysis.parola_target}: {analysis.occorrenze_target ?? 0}
                    </span>
                  ) : null}
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </section>
  );
}
