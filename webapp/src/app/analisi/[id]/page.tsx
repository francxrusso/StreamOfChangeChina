import Link from "next/link";
import { BarChart3, FileText } from "lucide-react";
import { getAdminSession } from "@/app/access-actions";
import { createServerSupabaseClient, hasServerSupabaseConfig } from "@/lib/supabase-server";
import { type PhraseStat, type WordStat } from "@/lib/word-analysis";
import { DeleteAnalysisButton } from "./delete-analysis-button";

export const dynamic = "force-dynamic";

type AnalysisRunDetail = {
  id: string;
  titolo: string;
  scope_tipo: "serie" | "stagioni" | "episodi";
  stagioni: number[];
  episodio_ids: string[];
  output_grafici: boolean;
  totale_episodi: number;
  totale_token: number;
  token_unici: number;
  top_parole: WordStat[];
  top_combinazioni: PhraseStat[];
  statistiche: {
    episodi?: Array<{
      id: string;
      stagione: number | null;
      numero_episodio: number | null;
      titolo_originale: string | null;
      token: number;
    }>;
  } | null;
  note_ai: string | null;
  created_at: string;
  serie_tv: {
    titolo_originale: string;
    genere: string | null;
  } | null;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function scopeLabel(analysis: AnalysisRunDetail) {
  if (analysis.scope_tipo === "stagioni") {
    return `Stagioni ${analysis.stagioni.join(", ") || "-"}`;
  }

  if (analysis.scope_tipo === "episodi") {
    return `${analysis.episodio_ids.length} episodi selezionati`;
  }

  return "Serie completa";
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-stone-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase text-stone-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
    </div>
  );
}

function WordBars({ words }: { words: WordStat[] }) {
  const max = Math.max(...words.map((word) => word.conteggio), 1);

  return (
    <div className="grid gap-3">
      {words.slice(0, 12).map((word) => (
        <div key={word.parola} className="grid gap-1">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-medium text-ink">{word.parola}</span>
            <span className="text-stone-600">{word.conteggio}</span>
          </div>
          <div className="h-2 rounded-full bg-stone-100">
            <div
              className="h-2 rounded-full bg-cinnabar"
              style={{ width: `${Math.max(4, (word.conteggio / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

async function getAnalysis(id: string) {
  const supabase = createServerSupabaseClient();

  if (!hasServerSupabaseConfig() || !supabase) {
    return {
      analysis: null,
      error: "Configurazione Supabase server mancante."
    };
  }

  const { data, error } = await supabase
    .from("analisi_create")
    .select("id,titolo,scope_tipo,stagioni,episodio_ids,output_grafici,totale_episodi,totale_token,token_unici,top_parole,top_combinazioni,statistiche,note_ai,created_at,serie_tv(titolo_originale,genere)")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return { analysis: null, error: error.message };
  }

  return { analysis: data as unknown as AnalysisRunDetail | null, error: null };
}

export default async function AnalysisDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getAdminSession();
  const { analysis, error } = await getAnalysis(id);

  if (error) {
    return (
      <section>
        <Link href="/analisi" className="text-sm font-medium text-cinnabar hover:text-ink">
          Torna alle analisi
        </Link>
        <div className="mt-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Impossibile caricare l'analisi: {error}
        </div>
      </section>
    );
  }

  if (!analysis) {
    return (
      <section>
        <Link href="/analisi" className="text-sm font-medium text-cinnabar hover:text-ink">
          Torna alle analisi
        </Link>
        <div className="mt-6 rounded-md border border-stone-200 bg-white p-5 text-sm text-stone-700">
          Analisi non trovata.
        </div>
      </section>
    );
  }

  return (
    <section className="grid gap-8">
      <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-start">
        <div>
          <Link href="/analisi" className="text-sm font-medium text-cinnabar hover:text-ink">
            Torna alle analisi
          </Link>
          <p className="mt-5 text-sm text-stone-600">{analysis.serie_tv?.titolo_originale}</p>
          <h1 className="mt-2 text-3xl font-semibold text-ink">{analysis.titolo}</h1>
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-stone-600">
            <span className="rounded-sm bg-stone-100 px-2 py-1">{scopeLabel(analysis)}</span>
            <span className="rounded-sm bg-stone-100 px-2 py-1">
              {analysis.output_grafici ? "Con grafici" : "Senza grafici"}
            </span>
            <span className="rounded-sm bg-stone-100 px-2 py-1">{formatDate(analysis.created_at)}</span>
          </div>
        </div>
        {session?.canEdit ? <DeleteAnalysisButton id={analysis.id} title={analysis.titolo} /> : null}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Episodi" value={analysis.totale_episodi} />
        <MetricCard label="Token" value={analysis.totale_token} />
        <MetricCard label="Token unici" value={analysis.token_unici} />
      </div>

      {analysis.output_grafici ? (
        <section className="rounded-md border border-stone-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <BarChart3 size={20} className="text-cinnabar" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-ink">Grafico parole ricorrenti</h2>
          </div>
          <div className="mt-5">
            <WordBars words={analysis.top_parole ?? []} />
          </div>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-md border border-stone-200 bg-white">
        <div className="flex items-center gap-3 border-b border-stone-200 p-4">
          <FileText size={20} className="text-cinnabar" aria-hidden="true" />
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
            {(analysis.top_parole ?? []).slice(0, 40).map((word) => (
              <tr key={word.parola} className="border-t border-stone-200">
                <td className="px-4 py-3 font-medium text-ink">{word.parola}</td>
                <td className="px-4 py-3 text-stone-700">{word.conteggio}</td>
                <td className="px-4 py-3 text-stone-700">{word.percentuale}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="overflow-hidden rounded-md border border-stone-200 bg-white">
        <div className="flex items-center gap-3 border-b border-stone-200 p-4">
          <FileText size={20} className="text-cinnabar" aria-hidden="true" />
          <h2 className="font-semibold text-ink">Combinazioni ricorrenti</h2>
        </div>
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-stone-50 text-stone-700">
            <tr>
              <th className="px-4 py-3 font-medium">Sequenza</th>
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 font-medium">Conteggio</th>
            </tr>
          </thead>
          <tbody>
            {(analysis.top_combinazioni ?? []).slice(0, 40).map((phrase) => (
              <tr key={`${phrase.frase}-${phrase.tipo}`} className="border-t border-stone-200">
                <td className="px-4 py-3 font-medium text-ink">{phrase.frase}</td>
                <td className="px-4 py-3 text-stone-700">{phrase.tipo}</td>
                <td className="px-4 py-3 text-stone-700">{phrase.conteggio}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {analysis.statistiche?.episodi?.length ? (
        <section className="rounded-md border border-stone-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-ink">Episodi inclusi</h2>
          <div className="mt-4 grid gap-2 text-sm text-stone-700">
            {analysis.statistiche.episodi.map((episode) => (
              <div key={episode.id} className="flex flex-wrap justify-between gap-3 border-t border-stone-100 py-3">
                <span>
                  S{episode.stagione ?? "-"} E{episode.numero_episodio ?? "-"} - {episode.titolo_originale ?? "Senza titolo"}
                </span>
                <span>{episode.token} token</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}
