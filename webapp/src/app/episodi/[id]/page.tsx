import Link from "next/link";
import { createServerSupabaseClient, hasServerSupabaseConfig } from "@/lib/supabase-server";
import { TranscriptViewer } from "@/components/transcript-viewer";

export const dynamic = "force-dynamic";

type EpisodeRecord = {
  id: string;
  serie_id: string;
  stagione: number | null;
  numero_episodio: number | null;
  titolo_originale: string | null;
  messa_in_onda: string | null;
  link_episodio: string | null;
  trascrizione: string | null;
  sintesi_automatica: string | null;
  analisi_tematica_emotiva: string | null;
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
};

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
        "id, serie_id, stagione, numero_episodio, titolo_originale, messa_in_onda, link_episodio, trascrizione, sintesi_automatica, analisi_tematica_emotiva, serie_tv(id, titolo_originale, titolo_inglese, visibility)"
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
      .select("id, stagione, numero_episodio, titolo_originale")
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

export default async function EpisodePage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { episodio, navigation, error } = await getEpisode(id);

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
        <div className="mt-4 flex flex-wrap gap-3 text-sm text-stone-700">
          <span>Stagione {episodio.stagione ?? "-"}</span>
          <span>Episodio {episodio.numero_episodio ?? "-"}</span>
          {episodio.messa_in_onda ? <span>{episodio.messa_in_onda}</span> : null}
        </div>
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
          </Link>
        ) : null}
      </nav>

      {episodio.sintesi_automatica ? (
        <section className="rounded-md border border-stone-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-ink">Sintesi</h2>
          <p className="mt-3 leading-7 text-stone-700">{episodio.sintesi_automatica}</p>
        </section>
      ) : null}

      {episodio.analisi_tematica_emotiva ? (
        <section className="rounded-md border border-stone-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-ink">Analisi Tematica Ed Emotiva</h2>
          <p className="mt-3 leading-7 text-stone-700">{episodio.analisi_tematica_emotiva}</p>
        </section>
      ) : null}

      <section className="rounded-md border border-stone-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-ink">Trascrizione</h2>
        {episodio.trascrizione ? (
          <TranscriptViewer text={episodio.trascrizione} />
        ) : (
          <p className="mt-5 border-t border-stone-100 pt-5 text-sm text-stone-600">
            Trascrizione non disponibile per questo episodio.
          </p>
        )}
      </section>
    </section>
  );
}
