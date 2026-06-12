import Link from "next/link";
import {
  type PublicEpisodio,
  type PublicPersonaggio,
  type PublicSerie
} from "@/lib/supabase";
import { createServerSupabaseClient, hasServerSupabaseConfig } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

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
      <div>
        <Link href="/serie" className="text-sm font-medium text-cinnabar hover:text-ink">
          Torna alle serie
        </Link>
        <h1 className="mt-4 text-3xl font-semibold text-ink">{serie.titolo_originale}</h1>
        {serie.titolo_inglese ? <p className="mt-2 text-stone-600">{serie.titolo_inglese}</p> : null}
        {serie.descrizione ? <p className="mt-5 max-w-3xl leading-7 text-stone-700">{serie.descrizione}</p> : null}
      </div>

      <div>
        <h2 className="text-xl font-semibold text-ink">Personaggi</h2>
        {personaggi.length > 0 ? (
          <div className="mt-4 overflow-hidden rounded-md border border-stone-200 bg-white">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-stone-50 text-stone-700">
                <tr>
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium">Genere</th>
                  <th className="px-4 py-3 font-medium">Fascia d'età</th>
                  <th className="px-4 py-3 font-medium">Lavoro</th>
                  <th className="px-4 py-3 font-medium">Descrizione</th>
                </tr>
              </thead>
              <tbody>
                {personaggi.map((personaggio) => (
                  <tr key={personaggio.id} className="border-t border-stone-200 align-top">
                    <td className="px-4 py-3">
                      <span className="font-medium text-ink">{personaggio.nome_originale}</span>
                      {personaggio.nome_pinyin ? (
                        <span className="mt-1 block text-xs text-stone-500">{personaggio.nome_pinyin}</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-stone-700">{personaggio.genere ?? "-"}</td>
                    <td className="px-4 py-3 text-stone-700">{personaggio.fascia_eta ?? "-"}</td>
                    <td className="px-4 py-3 text-stone-700">{personaggio.lavoro ?? "-"}</td>
                    <td className="px-4 py-3 text-stone-700">{personaggio.descrizione ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-4 rounded-md border border-stone-200 bg-white p-5 text-sm text-stone-700">
            Non ci sono ancora personaggi pubblici per questa serie.
          </div>
        )}
      </div>

      <div>
        <h2 className="text-xl font-semibold text-ink">Episodi</h2>
        <div className="mt-4 overflow-hidden rounded-md border border-stone-200 bg-white">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-stone-50 text-stone-700">
              <tr>
                <th className="px-4 py-3 font-medium">Stagione</th>
                <th className="px-4 py-3 font-medium">Episodio</th>
                <th className="px-4 py-3 font-medium">Titolo</th>
                <th className="px-4 py-3 font-medium">Messa in onda</th>
              </tr>
            </thead>
            <tbody>
              {episodi.map((episodio) => (
                <tr key={episodio.id} className="border-t border-stone-200">
                  <td className="px-4 py-3 text-stone-700">{episodio.stagione ?? "-"}</td>
                  <td className="px-4 py-3 text-stone-700">{episodio.numero_episodio ?? "-"}</td>
                  <td className="px-4 py-3 font-medium text-ink">
                    <Link href={`/episodi/${episodio.id}`} className="hover:text-cinnabar">
                      {episodio.titolo_originale ?? "Senza titolo"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-stone-700">{episodio.messa_in_onda ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
