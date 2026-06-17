import Link from "next/link";
import { type PublicDanmu, type PublicEmozione, type PublicFraseParola } from "@/lib/supabase";
import { createServerSupabaseClient, hasServerSupabaseConfig } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

type EmozioneWithCounts = PublicEmozione & {
  frasi_count: number;
  danmu_count: number;
};

function getValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function countByEmotion<T extends { emozioni: string[] | null; emozione_principale?: string | null }>(items: T[] | null) {
  const counts = new Map<string, number>();

  for (const item of items ?? []) {
    const names = new Set(item.emozioni ?? []);
    if (item.emozione_principale) {
      names.add(item.emozione_principale);
    }

    for (const name of names) {
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }

  return counts;
}

function matchesSearch(emozione: EmozioneWithCounts, query: string) {
  if (!query) {
    return true;
  }

  const searchableText = [
    emozione.nome,
    emozione.descrizione,
    emozione.colore_assoc,
    emozione.colore_hex,
    emozione.icona,
    emozione.sintesi_frasi_collegate_ai,
    emozione.analisi_semantica_frasi_ai
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return searchableText.includes(query.toLowerCase());
}

async function getEmozioni(filters: { q: string }) {
  const supabase = createServerSupabaseClient();

  if (!hasServerSupabaseConfig() || !supabase) {
    return {
      emozioni: [],
      error: "Configurazione Supabase server mancante. Controlla SUPABASE_SERVICE_ROLE_KEY e riavvia npm run dev."
    };
  }

  const q = filters.q.trim();

  try {
    const [{ data: emozioni }, { data: frasi, error: frasiError }, { data: danmu, error: danmuError }] =
      await Promise.all([
        supabase
          .from("public_emozioni")
          .select(
            "id,nome,descrizione,colore_assoc,colore_hex,icona,sintesi_frasi_collegate_ai,analisi_semantica_frasi_ai"
          )
          .order("nome", { ascending: true }),
        supabase.from("public_frasi_parole").select("emozione_principale,emozioni").limit(5000),
        supabase.from("public_danmu").select("emozioni").limit(5000)
      ]);

    if (frasiError) {
      return { emozioni: [], error: frasiError.message };
    }

    if (danmuError) {
      return { emozioni: [], error: danmuError.message };
    }

    const frasiCounts = countByEmotion((frasi ?? []) as Pick<PublicFraseParola, "emozione_principale" | "emozioni">[]);
    const danmuCounts = countByEmotion((danmu ?? []) as Pick<PublicDanmu, "emozioni">[]);
    const knownNames = new Set<string>();

    const fullEmozioni = ((emozioni ?? []) as PublicEmozione[]).map((emozione) => {
      knownNames.add(emozione.nome);

      return {
        ...emozione,
        frasi_count: frasiCounts.get(emozione.nome) ?? 0,
        danmu_count: danmuCounts.get(emozione.nome) ?? 0
      };
    });

    const publicOnlyEmozioni = [...new Set([...frasiCounts.keys(), ...danmuCounts.keys()])]
      .filter((nome) => !knownNames.has(nome))
      .map((nome) => ({
        id: `public-${nome}`,
        nome,
        descrizione: null,
        colore_assoc: null,
        colore_hex: null,
        icona: null,
        sintesi_frasi_collegate_ai: null,
        analisi_semantica_frasi_ai: null,
        frasi_count: frasiCounts.get(nome) ?? 0,
        danmu_count: danmuCounts.get(nome) ?? 0
      }));

    const allEmozioni = [...fullEmozioni, ...publicOnlyEmozioni].sort((a, b) => a.nome.localeCompare(b.nome, "it"));

    return {
      emozioni: allEmozioni.filter((emozione) => matchesSearch(emozione, q)),
      error: null
    };
  } catch (unknownError) {
    const message =
      unknownError instanceof Error
        ? unknownError.message
        : "Errore sconosciuto durante il caricamento delle emozioni.";

    return { emozioni: [], error: message };
  }
}

export default async function EmozioniPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filters = {
    q: getValue(params.q)
  };
  const { emozioni, error } = await getEmozioni(filters);

  return (
    <section className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Emozioni</h1>
        <p className="mt-3 max-w-3xl text-stone-700">
          Vocabolario controllato delle emozioni usate per annotare frasi, parole e Danmu pubblici.
        </p>
      </div>

      <form className="grid gap-3 rounded-md border border-stone-200 bg-white p-4 md:grid-cols-[1fr_auto]" action="/emozioni">
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-ink">Ricerca</span>
          <input
            name="q"
            defaultValue={filters.q}
            className="rounded-md border border-stone-300 px-3 py-2 text-stone-900 outline-none focus:border-cinnabar"
            placeholder="Nome, descrizione, colore, analisi"
          />
        </label>
        <div className="flex items-end gap-3">
          <button className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-cinnabar">
            Cerca
          </button>
          <Link href="/emozioni" className="px-2 py-2 text-sm font-medium text-cinnabar hover:text-ink">
            Azzera
          </Link>
        </div>
      </form>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Impossibile caricare le emozioni: {error}
        </div>
      ) : null}

      {!error && emozioni.length === 0 ? (
        <div className="rounded-md border border-stone-200 bg-white p-5 text-sm text-stone-700">
          Nessuna emozione trovata con questi criteri.
        </div>
      ) : null}

      {emozioni.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {(emozioni as EmozioneWithCounts[]).map((emozione) => (
            <article key={emozione.id} className="rounded-md border border-stone-200 bg-white p-5">
              <div className="flex items-start gap-4">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-stone-200 text-xl"
                  style={{
                    backgroundColor: emozione.colore_hex ? `${emozione.colore_hex}18` : undefined,
                    color: emozione.colore_hex ?? undefined
                  }}
                  aria-hidden="true"
                >
                  {emozione.icona ?? emozione.nome.slice(0, 1)}
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-ink">{emozione.nome}</h2>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-stone-600">
                    {emozione.colore_assoc ? (
                      <span className="rounded-sm bg-stone-100 px-2 py-1">{emozione.colore_assoc}</span>
                    ) : null}
                    <span className="rounded-sm bg-stone-100 px-2 py-1">{emozione.frasi_count} frasi</span>
                    <span className="rounded-sm bg-stone-100 px-2 py-1">{emozione.danmu_count} Danmu</span>
                  </div>
                </div>
              </div>

              {emozione.descrizione ? (
                <p className="mt-4 text-sm leading-6 text-stone-700">{emozione.descrizione}</p>
              ) : null}

              {emozione.sintesi_frasi_collegate_ai ? (
                <p className="mt-4 border-l-2 border-stone-200 pl-3 text-sm leading-6 text-stone-600">
                  {emozione.sintesi_frasi_collegate_ai}
                </p>
              ) : null}

              <div className="mt-5 flex flex-wrap gap-3 text-sm font-medium">
                <Link
                  href={`/frasi?emozione=${encodeURIComponent(emozione.nome)}`}
                  className="text-cinnabar hover:text-ink"
                >
                  Vedi lessico
                </Link>
                <Link
                  href={`/danmu?emozione=${encodeURIComponent(emozione.nome)}`}
                  className="text-cinnabar hover:text-ink"
                >
                  Vedi Danmu
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
