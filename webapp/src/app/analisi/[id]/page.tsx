import Link from "next/link";
import { BarChart3, FileText } from "lucide-react";
import { getAdminSession } from "@/app/access-actions";
import { QuickAdminActions } from "@/components/quick-admin-actions";
import { createServerSupabaseClient, hasServerSupabaseConfig } from "@/lib/supabase-server";
import {
  type CharacterLexicalStat,
  type ConstructionStat,
  type PhraseStat,
  type TargetStat,
  type WordStat
} from "@/lib/word-analysis";

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
    target?: TargetStat[];
    personaggi?: CharacterLexicalStat[];
    costrutti_ricorrenti?: ConstructionStat[];
    modi_di_dire?: PhraseStat[];
    riferimenti?: WordStat[];
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

type NoticeData = {
  status: "success" | "error";
  message: string;
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

function joinedPhrase(phrase: PhraseStat) {
  return phrase.frase.replace(/\s+/g, "");
}

function displayPinyin(value: string | null | undefined) {
  return value ? <span className="ml-2 text-xs font-normal text-stone-500">{value}</span> : null;
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

export default async function AnalysisDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const notice = getNotice(query);
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
      {notice ? <Notice notice={notice} /> : null}

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
        {session?.canEdit ? (
          <QuickAdminActions
            resource="analisi"
            id={analysis.id}
            title={analysis.titolo}
            returnTo={`/analisi/${analysis.id}`}
            deleteReturnTo="/analisi"
            fields={[
              { name: "titolo", label: "Titolo", value: analysis.titolo },
              { name: "note_ai", label: "Note", type: "textarea", value: analysis.note_ai },
              {
                name: "output_grafici",
                label: "Grafici",
                type: "select",
                value: String(analysis.output_grafici),
                options: [
                  { value: "true", label: "Con grafici" },
                  { value: "false", label: "Senza grafici" }
                ]
              }
            ]}
          />
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Episodi" value={analysis.totale_episodi} />
        <MetricCard label="Token" value={analysis.totale_token} />
        <MetricCard label="Token unici" value={analysis.token_unici} />
      </div>

      {analysis.statistiche?.target?.length ? (
        <section className="rounded-md border border-stone-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-ink">Parole e costrutti monitorati</h2>
          <p className="mt-2 text-sm text-stone-600">
            Conteggi calcolati sui target inseriti nella creazione dell'analisi.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {analysis.statistiche.target.map((target) => (
              <article key={`${target.tipo}-${target.valore}`} className="rounded-md border border-stone-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase text-stone-500">
                      {target.tipo === "parola" ? "Parola" : "Costrutto"}
                    </p>
                    <h3 className="mt-1 font-semibold text-ink">{target.valore}</h3>
                    {target.normalizzato !== target.valore ? (
                      <p className="mt-1 text-xs text-stone-500">Normalizzato: {target.normalizzato}</p>
                    ) : null}
                  </div>
                  <span className="rounded-sm bg-stone-100 px-2 py-1 text-sm font-semibold text-ink">
                    {target.conteggio}
                  </span>
                </div>
                <p className="mt-3 text-sm text-stone-600">Densita: {target.densita}%</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {analysis.statistiche?.personaggi?.length ? (
        <section className="rounded-md border border-stone-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-ink">Personaggi e lessico associato</h2>
          <p className="mt-2 text-sm text-stone-600">
            Quando la trascrizione non indica lo speaker, il sistema usa i contesti in cui il personaggio viene citato.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {analysis.statistiche.personaggi.slice(0, 8).map((character) => (
              <article key={character.personaggio} className="rounded-md border border-stone-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="font-semibold text-ink">{character.personaggio}</h3>
                  <span className="rounded-sm bg-stone-100 px-2 py-1 text-xs text-stone-600">
                    {character.menzioni} {character.metodo === "speaker" ? "battute" : "menzioni"}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-stone-700">
                  {character.parole_caratterizzanti.slice(0, 6).map((word) => (
                    <span key={`${character.personaggio}-${word.parola}`} className="rounded-sm border border-stone-200 px-2 py-1">
                      {word.parola} ({word.conteggio})
                    </span>
                  ))}
                  {character.combinazioni_caratterizzanti.slice(0, 3).map((phrase) => (
                    <span key={`${character.personaggio}-${phrase.frase}`} className="rounded-sm border border-cinnabar/30 px-2 py-1 text-cinnabar">
                      {joinedPhrase(phrase)} ({phrase.conteggio})
                    </span>
                  ))}
                </div>
                {character.contesti[0] ? (
                  <p className="mt-3 border-l-2 border-stone-200 pl-3 text-sm leading-6 text-stone-600">
                    {character.contesti[0]}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {(analysis.statistiche?.costrutti_ricorrenti?.length || analysis.statistiche?.modi_di_dire?.length || analysis.statistiche?.riferimenti?.length) ? (
        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-md border border-stone-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-ink">Costrutti ricorrenti</h2>
            <div className="mt-4 grid gap-3 text-sm">
              {(analysis.statistiche?.costrutti_ricorrenti ?? []).slice(0, 12).map((construction) => (
                <article key={`${construction.costrutto}-${construction.tipo}`} className="rounded-md border border-stone-200 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-ink">
                        {construction.costrutto}
                        {displayPinyin(construction.pinyin)}
                      </p>
                      <p className="mt-1 text-xs text-stone-500">{construction.tipo}</p>
                    </div>
                    <span className="rounded-sm bg-stone-100 px-2 py-1 text-xs text-stone-700">
                      {construction.conteggio}
                    </span>
                  </div>
                  {construction.esempi[0] ? (
                    <p className="mt-2 border-l-2 border-stone-200 pl-3 text-xs leading-5 text-stone-600">
                      {construction.esempi[0]}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-stone-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-ink">Modi di dire e formule</h2>
            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              {(analysis.statistiche?.modi_di_dire ?? []).slice(0, 18).map((phrase) => (
                <span key={`${phrase.frase}-${phrase.tipo}`} className="rounded-sm border border-cinnabar/30 px-2 py-1 text-cinnabar">
                  {joinedPhrase(phrase)} ({phrase.conteggio})
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-stone-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-ink">Riferimenti ricorrenti</h2>
            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              {(analysis.statistiche?.riferimenti ?? []).slice(0, 18).map((reference) => (
                <span key={reference.parola} className="rounded-sm border border-stone-200 px-2 py-1 text-stone-700">
                  {reference.parola} ({reference.conteggio})
                </span>
              ))}
            </div>
          </div>
        </section>
      ) : null}

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
              <th className="px-4 py-3 font-medium">Pinyin</th>
              <th className="px-4 py-3 font-medium">Conteggio</th>
              <th className="px-4 py-3 font-medium">Peso</th>
            </tr>
          </thead>
          <tbody>
            {(analysis.top_parole ?? []).slice(0, 40).map((word) => (
              <tr key={word.parola} className="border-t border-stone-200">
                <td className="px-4 py-3 font-medium text-ink">{word.parola}</td>
                <td className="px-4 py-3 text-stone-600">{word.pinyin ?? "-"}</td>
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
              <th className="px-4 py-3 font-medium">Pinyin</th>
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 font-medium">Conteggio</th>
            </tr>
          </thead>
          <tbody>
            {(analysis.top_combinazioni ?? []).slice(0, 40).map((phrase) => (
              <tr key={`${phrase.frase}-${phrase.tipo}`} className="border-t border-stone-200">
                <td className="px-4 py-3 font-medium text-ink">{phrase.frase}</td>
                <td className="px-4 py-3 text-stone-600">{phrase.pinyin ?? "-"}</td>
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
