import Link from "next/link";
import { BarChart3, FileText, Layers3 } from "lucide-react";
import { getAdminSession } from "@/app/access-actions";
import { createServerSupabaseClient, hasServerSupabaseConfig } from "@/lib/supabase-server";
import {
  CreateAnalysisModal,
  type AnalysisEpisodeOption,
  type AnalysisSerieOption
} from "./create-analysis-modal";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  status?: string;
  message?: string;
}>;

type AnalysisNotice = {
  status: "success" | "error";
  message: string;
};

type AnalysisRun = {
  id: string;
  titolo: string;
  scope_tipo: "serie" | "stagioni" | "episodi";
  stagioni: number[];
  episodio_ids: string[];
  output_grafici: boolean;
  totale_episodi: number;
  totale_token: number;
  token_unici: number;
  created_at: string;
  serie_tv: {
    titolo_originale: string;
    genere: string | null;
  } | null;
};

function getValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function getNotice(params: { status?: string; message?: string }): AnalysisNotice | null {
  const status = params.status;
  const message = params.message;

  if ((status !== "success" && status !== "error") || !message) {
    return null;
  }

  return { status, message };
}

function Notice({ notice }: { notice: AnalysisNotice }) {
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function scopeLabel(analysis: AnalysisRun) {
  if (analysis.scope_tipo === "stagioni") {
    return `Stagioni ${analysis.stagioni.join(", ") || "-"}`;
  }

  if (analysis.scope_tipo === "episodi") {
    return `${analysis.episodio_ids.length} episodi selezionati`;
  }

  return "Serie completa";
}

async function getAnalysisPageData() {
  const supabase = createServerSupabaseClient();

  if (!hasServerSupabaseConfig() || !supabase) {
    return {
      series: [] as AnalysisSerieOption[],
      episodes: [] as AnalysisEpisodeOption[],
      analyses: [] as AnalysisRun[],
      error: "Configurazione Supabase server mancante."
    };
  }

  const [{ data: series, error: seriesError }, { data: episodes, error: episodesError }, { data: analyses, error: analysesError }] =
    await Promise.all([
      supabase.from("serie_tv").select("id,titolo_originale").order("titolo_originale", { ascending: true }),
      supabase
        .from("episodi")
        .select("id,serie_id,stagione,numero_episodio,titolo_originale")
        .order("stagione", { ascending: true })
        .order("numero_episodio", { ascending: true }),
      supabase
        .from("analisi_create")
        .select("id,titolo,scope_tipo,stagioni,episodio_ids,output_grafici,totale_episodi,totale_token,token_unici,created_at,serie_tv(titolo_originale,genere)")
        .order("created_at", { ascending: false })
        .limit(50)
    ]);

  const firstError = seriesError ?? episodesError ?? analysesError;

  if (firstError) {
    return {
      series: [] as AnalysisSerieOption[],
      episodes: [] as AnalysisEpisodeOption[],
      analyses: [] as AnalysisRun[],
      error: firstError.message
    };
  }

  return {
    series: (series ?? []) as AnalysisSerieOption[],
    episodes: (episodes ?? []) as AnalysisEpisodeOption[],
    analyses: (analyses ?? []) as unknown as AnalysisRun[],
    error: null
  };
}

export default async function AnalysisPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const session = await getAdminSession();
  const notice = getNotice({
    status: getValue(params.status),
    message: getValue(params.message)
  });
  const { series, episodes, analyses, error } = await getAnalysisPageData();

  return (
    <section className="space-y-8">
      <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <h1 className="text-3xl font-semibold text-ink">Analisi</h1>
          <p className="mt-3 max-w-3xl text-stone-700">
            Crea analisi lessicali sul mandarino partendo da una serie intera, stagioni specifiche o singoli episodi.
          </p>
        </div>
        {session?.canEdit ? <CreateAnalysisModal series={series} episodes={episodes} /> : null}
      </div>

      {notice ? <Notice notice={notice} /> : null}

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Impossibile caricare le analisi: {error}
        </div>
      ) : null}

      {!error && analyses.length === 0 ? (
        <div className="rounded-md border border-dashed border-stone-300 bg-white p-6 text-sm text-stone-700">
          Nessuna analisi creata. Usa il pulsante “Crea nuova analisi” per iniziare.
        </div>
      ) : null}

      {analyses.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {analyses.map((analysis) => (
            <Link
              key={analysis.id}
              href={`/analisi/${analysis.id}`}
              className="rounded-md border border-stone-200 bg-white p-5 transition hover:border-cinnabar hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-stone-100 text-cinnabar">
                  {analysis.output_grafici ? <BarChart3 size={20} aria-hidden="true" /> : <FileText size={20} aria-hidden="true" />}
                </span>
                <span className="text-right text-xs text-stone-500">{formatDate(analysis.created_at)}</span>
              </div>
              <h2 className="mt-4 text-lg font-semibold leading-7 text-ink">{analysis.titolo}</h2>
              <p className="mt-2 text-sm text-stone-600">{analysis.serie_tv?.genere ?? "Genere non impostato"}</p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-stone-600">
                <span className="rounded-sm bg-stone-100 px-2 py-1">{scopeLabel(analysis)}</span>
                <span className="rounded-sm bg-stone-100 px-2 py-1">{analysis.totale_episodi} episodi</span>
                <span className="rounded-sm bg-stone-100 px-2 py-1">{analysis.totale_token} token</span>
                <span className="rounded-sm bg-stone-100 px-2 py-1">{analysis.token_unici} unici</span>
              </div>
              <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-cinnabar">
                <Layers3 size={15} aria-hidden="true" />
                Apri dettaglio
              </div>
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}
