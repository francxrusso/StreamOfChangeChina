import Link from "next/link";
import { Quote, Sparkles } from "lucide-react";
import { getAdminSession } from "@/app/access-actions";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { QuickAdminActions } from "@/components/quick-admin-actions";
import { createServerSupabaseClient, hasServerSupabaseConfig } from "@/lib/supabase-server";
import { TranscriptViewer } from "@/components/transcript-viewer";
import { generateEpisodeAIFields } from "./actions";
import { QuickLessicoModal } from "./quick-lessico-modal";

export const dynamic = "force-dynamic";

type EpisodeRecord = {
  id: string;
  serie_id: string;
  stagione: number | null;
  numero_episodio: number | null;
  titolo_originale: string | null;
  titolo_pinyin: string | null;
  messa_in_onda: string | null;
  link_episodio: string | null;
  trascrizione: string | null;
  sintesi_automatica: string | null;
  analisi_tematica_emotiva: string | null;
  analisi_tematica_parole: string | null;
  analisi_emozioni: string | null;
  serie_tv: {
    id: string;
    titolo_originale: string;
    titolo_inglese: string | null;
    visibility: string;
  } | null;
};

type EpisodeNavRecord = {
  id: string;
  stagione: number | null;
  numero_episodio: number | null;
  titolo_originale: string | null;
  titolo_pinyin: string | null;
};

type EpisodeNotice = {
  status: "success" | "error";
  message: string;
};

type EpisodeDialogueLine = {
  id: string;
  ordine: number;
  parlante_label: string;
  testo_originale: string;
  personaggi:
    | {
    nome_originale: string;
    nome_italiano: string | null;
      }
    | {
        nome_originale: string;
        nome_italiano: string | null;
      }[]
    | null;
};

type QuickLessicoOption = {
  id: string;
  label: string;
};

type QuickLessicoOptions = {
  personaggi: QuickLessicoOption[];
  emozioni: QuickLessicoOption[];
};

const emptyQuickLessicoOptions: QuickLessicoOptions = {
  personaggi: [],
  emozioni: []
};

function getValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function getNotice(searchParams: Record<string, string | string[] | undefined>): EpisodeNotice | null {
  const status = getValue(searchParams.status);
  const message = getValue(searchParams.message);

  if ((status !== "success" && status !== "error") || !message) {
    return null;
  }

  return { status, message };
}

function Notice({ notice }: { notice: EpisodeNotice }) {
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

function stripQuoteMarks(value: string) {
  return value
    .replace(/^["'“”‘’«»\s]+/u, "")
    .replace(/["'“”‘’«»\s]+$/u, "")
    .trim();
}

function parseEpisodeSummary(value: string) {
  const lines = value.split(/\r?\n/);
  let lastContentIndex = -1;

  for (let index = lines.length - 1; index >= 0; index -= 1) {
    if (lines[index].trim().length > 0) {
      lastContentIndex = index;
      break;
    }
  }

  if (lastContentIndex < 0) {
    return { body: "", quote: "" };
  }

  const lastLine = lines[lastContentIndex].trim();
  const citationMatch = lastLine.match(/^citazione\s*:\s*(.+)$/iu);
  const quoteOnlyMatch = lastLine.match(/^[“"].+[”"]$/u);
  const quote = citationMatch ? stripQuoteMarks(citationMatch[1]) : quoteOnlyMatch ? stripQuoteMarks(lastLine) : "";

  if (!quote) {
    return { body: value.trim(), quote: "" };
  }

  const body = [...lines.slice(0, lastContentIndex), ...lines.slice(lastContentIndex + 1)].join("\n").trim();

  return { body, quote };
}

function SummaryContent({ value }: { value: string }) {
  const { body, quote } = parseEpisodeSummary(value);
  const paragraphs = body
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <div className="mt-3 grid gap-4">
      {paragraphs.length > 0 ? (
        paragraphs.map((paragraph, index) => (
          <p key={`${index}-${paragraph.slice(0, 24)}`} className="leading-7 text-stone-700">
            {paragraph}
          </p>
        ))
      ) : quote ? null : (
        <p className="leading-7 text-stone-700">{value}</p>
      )}

      {quote ? (
        <figure className="border-l-4 border-cinnabar bg-red-50/60 px-5 py-4">
          <Quote size={18} className="text-cinnabar" aria-hidden="true" />
          <blockquote className="mt-2 text-base leading-8 text-ink">{quote}</blockquote>
        </figure>
      ) : null}
    </div>
  );
}

async function getEpisode(id: string) {
  if (!hasServerSupabaseConfig()) {
    return {
      episodio: null,
      navigation: { previous: null, next: null },
      error: "Configurazione Supabase mancante. Controlla webapp/.env.local e riavvia npm run dev."
    };
  }

  const supabase = createServerSupabaseClient();
  if (!supabase) {
    return {
      episodio: null,
      navigation: { previous: null, next: null },
      error: "Client Supabase non disponibile."
    };
  }

  try {
    const { data, error } = await supabase
      .from("episodi")
      .select(
        "id, serie_id, stagione, numero_episodio, titolo_originale, titolo_pinyin, messa_in_onda, link_episodio, trascrizione, sintesi_automatica, analisi_tematica_emotiva, analisi_tematica_parole, analisi_emozioni, serie_tv(id, titolo_originale, titolo_inglese, visibility)"
      )
      .eq("id", id)
      .eq("visibility", "public")
      .maybeSingle();

    if (error) {
      return { episodio: null, navigation: { previous: null, next: null }, error: error.message };
    }

    const episodio = data as EpisodeRecord | null;

    if (episodio?.serie_tv?.visibility !== "public") {
      return { episodio: null, navigation: { previous: null, next: null }, error: null };
    }

    const { data: siblingData, error: siblingError } = await supabase
      .from("episodi")
      .select("id, stagione, numero_episodio, titolo_originale, titolo_pinyin")
      .eq("serie_id", episodio.serie_id)
      .eq("visibility", "public")
      .order("stagione", { ascending: true })
      .order("numero_episodio", { ascending: true });

    if (siblingError) {
      return { episodio, navigation: { previous: null, next: null }, error: null };
    }

    const siblings = (siblingData ?? []) as EpisodeNavRecord[];
    const currentIndex = siblings.findIndex((item) => item.id === episodio.id);

    return {
      episodio,
      navigation: {
        previous: currentIndex > 0 ? siblings[currentIndex - 1] : null,
        next: currentIndex >= 0 && currentIndex < siblings.length - 1 ? siblings[currentIndex + 1] : null
      },
      error: null
    };
  } catch (unknownError) {
    const message =
      unknownError instanceof Error
        ? unknownError.message
        : "Errore sconosciuto durante il caricamento dell'episodio.";

    return { episodio: null, navigation: { previous: null, next: null }, error: message };
  }
}

async function getQuickLessicoOptions(serieId: string): Promise<QuickLessicoOptions> {
  const supabase = createServerSupabaseClient();

  if (!hasServerSupabaseConfig() || !supabase) {
    return emptyQuickLessicoOptions;
  }

  const [{ data: personaggi }, { data: emozioni }] = await Promise.all([
    supabase
      .from("personaggi")
      .select("id,nome_originale,nome_italiano")
      .eq("serie_id", serieId)
      .order("nome_originale", { ascending: true }),
    supabase.from("emozioni").select("id,nome").order("nome", { ascending: true })
  ]);

  return {
    personaggi: (personaggi ?? []).map((personaggio) => ({
      id: String(personaggio.id),
      label: [personaggio.nome_originale, personaggio.nome_italiano].filter(Boolean).join(" / ")
    })),
    emozioni: (emozioni ?? []).map((emozione) => ({
      id: String(emozione.id),
      label: String(emozione.nome)
    }))
  };
}

async function getEpisodeDialogueLines(episodeId: string) {
  const supabase = createServerSupabaseClient();

  if (!hasServerSupabaseConfig() || !supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("episodio_battute")
    .select("id, ordine, parlante_label, testo_originale, personaggi(nome_originale, nome_italiano)")
    .eq("episodio_id", episodeId)
    .order("ordine", { ascending: true });

  if (error) {
    return [];
  }

  return ((data ?? []) as EpisodeDialogueLine[]).map((line) => {
    const personaggio = Array.isArray(line.personaggi) ? line.personaggi[0] : line.personaggi;

    return {
      speaker: personaggio?.nome_originale ?? line.parlante_label,
      text: line.testo_originale
    };
  });
}

export default async function EpisodePage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const session = await getAdminSession();
  const { episodio, navigation, error } = await getEpisode(id);
  const notice = getNotice(query);

  if (error) {
    return (
      <section>
        <Link href="/serie" className="text-sm font-medium text-cinnabar hover:text-ink">
          Torna alle serie
        </Link>
        <div className="mt-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Impossibile caricare l'episodio: {error}
        </div>
      </section>
    );
  }

  if (!episodio) {
    return (
      <section>
        <Link href="/serie" className="text-sm font-medium text-cinnabar hover:text-ink">
          Torna alle serie
        </Link>
        <div className="mt-6 rounded-md border border-stone-200 bg-white p-5 text-sm text-stone-700">
          Episodio non trovato o non pubblico.
        </div>
      </section>
    );
  }

  const missingSummary = !episodio.sintesi_automatica?.trim();
  const thematicAnalysis = episodio.analisi_tematica_parole?.trim() || episodio.analisi_tematica_emotiva?.trim() || "";
  const emotionAnalysis = episodio.analisi_emozioni?.trim() || "";
  const missingThemeAnalysis = !episodio.analisi_tematica_parole?.trim();
  const missingEmotionAnalysis = !emotionAnalysis;
  const canGenerateAI = Boolean(session?.canEdit && episodio.trascrizione);
  const shouldRegenerateAI = !missingSummary && !missingThemeAnalysis && !missingEmotionAnalysis;
  const quickLessicoOptions = session?.canEdit
    ? await getQuickLessicoOptions(episodio.serie_id)
    : emptyQuickLessicoOptions;
  const dialogueSegments = await getEpisodeDialogueLines(episodio.id);

  return (
    <section className="grid gap-8">
      <div>
        <Link href={`/serie/${episodio.serie_id}`} className="text-sm font-medium text-cinnabar hover:text-ink">
          Torna agli episodi
        </Link>
        <p className="mt-5 text-sm text-stone-600">{episodio.serie_tv?.titolo_originale}</p>
        <h1 className="mt-2 text-3xl font-semibold text-ink">
          {episodio.titolo_originale ?? "Senza titolo"}
        </h1>
        {episodio.titolo_pinyin ? <p className="mt-2 text-stone-600">{episodio.titolo_pinyin}</p> : null}
        <div className="mt-4 flex flex-wrap gap-3 text-sm text-stone-700">
          <span>Stagione {episodio.stagione ?? "-"}</span>
          <span>Episodio {episodio.numero_episodio ?? "-"}</span>
          {episodio.messa_in_onda ? <span>{episodio.messa_in_onda}</span> : null}
        </div>
        {session?.canEdit ? (
          <div className="mt-5">
            <QuickAdminActions
              resource="episodi"
              id={episodio.id}
              title={episodio.titolo_originale ?? "Episodio"}
              returnTo={`/episodi/${episodio.id}`}
              deleteReturnTo={`/serie/${episodio.serie_id}`}
              align="start"
              fields={[
                { name: "stagione", label: "Stagione", type: "number", value: episodio.stagione },
                { name: "numero_episodio", label: "Numero episodio", type: "number", value: episodio.numero_episodio },
                { name: "titolo_originale", label: "Titolo originale", value: episodio.titolo_originale },
                { name: "titolo_pinyin", label: "Titolo pinyin", value: episodio.titolo_pinyin },
                { name: "messa_in_onda", label: "Messa in onda", type: "date", value: episodio.messa_in_onda },
                { name: "link_episodio", label: "Link episodio", value: episodio.link_episodio },
                { name: "sintesi_automatica", label: "Trama / sintesi", type: "textarea", value: episodio.sintesi_automatica },
                { name: "analisi_tematica_parole", label: "Analisi tematica per parole", type: "textarea", value: episodio.analisi_tematica_parole },
                { name: "analisi_emozioni", label: "Analisi emozioni", type: "textarea", value: episodio.analisi_emozioni },
                { name: "trascrizione", label: "Trascrizione", type: "textarea", value: episodio.trascrizione }
              ]}
            />
          </div>
        ) : null}
        {episodio.link_episodio ? (
          <a
            href={episodio.link_episodio}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex rounded-md bg-cinnabar px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            Apri link episodio
          </a>
        ) : null}
      </div>

      <nav className="grid gap-3 md:grid-cols-2">
        {navigation.previous ? (
          <Link
            href={`/episodi/${navigation.previous.id}`}
            className="rounded-md border border-stone-200 bg-white p-4 text-sm hover:border-cinnabar"
          >
            <span className="block text-stone-500">Episodio precedente</span>
            <span className="mt-1 block font-medium text-ink">
              {navigation.previous.numero_episodio}. {navigation.previous.titolo_originale}
            </span>
            {navigation.previous.titolo_pinyin ? (
              <span className="mt-1 block text-xs text-stone-500">{navigation.previous.titolo_pinyin}</span>
            ) : null}
          </Link>
        ) : (
          <div />
        )}

        {navigation.next ? (
          <Link
            href={`/episodi/${navigation.next.id}`}
            className="rounded-md border border-stone-200 bg-white p-4 text-right text-sm hover:border-cinnabar"
          >
            <span className="block text-stone-500">Episodio successivo</span>
            <span className="mt-1 block font-medium text-ink">
              {navigation.next.numero_episodio}. {navigation.next.titolo_originale}
            </span>
            {navigation.next.titolo_pinyin ? (
              <span className="mt-1 block text-xs text-stone-500">{navigation.next.titolo_pinyin}</span>
            ) : null}
          </Link>
        ) : null}
      </nav>

      {notice ? <Notice notice={notice} /> : null}

      {canGenerateAI ? (
        <section className="rounded-md border border-stone-200 bg-white p-5">
          <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <h2 className="text-lg font-semibold text-ink">Genera un'analisi AI basata sulla trascrizione</h2>
              <p className="mt-2 text-sm leading-6 text-stone-700">
                Crea o aggiorna tre sezioni separate: trama/sintesi, analisi tematica per parole e analisi delle emozioni.
              </p>
            </div>
            <form action={generateEpisodeAIFields}>
              <input type="hidden" name="episodio_id" value={episodio.id} />
              {shouldRegenerateAI ? <input type="hidden" name="force_regenerate" value="true" /> : null}
              <PendingSubmitButton
                pendingText="Generazione..."
                className="inline-flex items-center justify-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-cinnabar disabled:cursor-wait disabled:bg-ink/70"
              >
                <Sparkles size={16} aria-hidden="true" />
                {shouldRegenerateAI ? "Rigenera analisi AI" : "Genera analisi AI"}
              </PendingSubmitButton>
            </form>
          </div>
        </section>
      ) : null}

      {session?.canEdit && !episodio.trascrizione && (missingSummary || missingThemeAnalysis || missingEmotionAnalysis) ? (
        <section className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Serve una trascrizione per generare automaticamente sintesi e analisi.
        </section>
      ) : null}

      {episodio.sintesi_automatica ? (
        <section className="rounded-md border border-stone-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-ink">Trama / Sintesi</h2>
          <SummaryContent value={episodio.sintesi_automatica} />
        </section>
      ) : null}

      {thematicAnalysis ? (
        <section className="rounded-md border border-stone-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-ink">Analisi Tematica Per Parole</h2>
          <p className="mt-3 leading-7 text-stone-700">{thematicAnalysis}</p>
        </section>
      ) : null}

      {emotionAnalysis ? (
        <section className="rounded-md border border-stone-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-ink">Analisi Emozioni</h2>
          <p className="mt-3 leading-7 text-stone-700">{emotionAnalysis}</p>
        </section>
      ) : null}

      <section className="rounded-md border border-stone-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-ink">Trascrizione</h2>
          {session?.canEdit ? (
            <QuickLessicoModal
              episodeId={episodio.id}
              serieId={episodio.serie_id}
              personaggi={quickLessicoOptions.personaggi}
              emozioni={quickLessicoOptions.emozioni}
            />
          ) : null}
        </div>
        {episodio.trascrizione || dialogueSegments.length > 0 ? (
          <TranscriptViewer text={episodio.trascrizione ?? ""} segments={dialogueSegments} />
        ) : (
          <p className="mt-5 border-t border-stone-100 pt-5 text-sm text-stone-600">
            Trascrizione non disponibile per questo episodio.
          </p>
        )}
      </section>
    </section>
  );
}
