import { type PublicDanmu, type PublicSerie } from "@/lib/supabase";
import { createServerSupabaseClient, hasServerSupabaseConfig } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

type SearchParams = {
  q?: string;
  serie?: string;
  emozione?: string;
  episodio?: string;
};

type OptionData = {
  serie: PublicSerie[];
  emozioni: string[];
  episodi: number[];
};

const emptyOptions: OptionData = {
  serie: [],
  emozioni: [],
  episodi: []
};

function getValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function formatTime(seconds: number | null) {
  if (seconds === null) {
    return null;
  }

  const roundedSeconds = Math.floor(seconds);
  const minutes = Math.floor(roundedSeconds / 60);
  const remainingSeconds = roundedSeconds % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

async function getOptions() {
  const supabase = createServerSupabaseClient();

  if (!hasServerSupabaseConfig() || !supabase) {
    return emptyOptions;
  }

  const [{ data: serie }, { data: danmu }] = await Promise.all([
    supabase.from("public_serie_tv").select("id,titolo_originale").order("titolo_originale", { ascending: true }),
    supabase.from("public_danmu").select("emozioni,numero_episodio").limit(1000)
  ]);

  const emozioni = new Set<string>();
  const episodi = new Set<number>();

  for (const item of danmu ?? []) {
    for (const emozione of item.emozioni ?? []) {
      emozioni.add(emozione);
    }
    if (item.numero_episodio) {
      episodi.add(item.numero_episodio);
    }
  }

  return {
    serie: (serie ?? []) as PublicSerie[],
    emozioni: [...emozioni].sort((a, b) => a.localeCompare(b, "it")),
    episodi: [...episodi].sort((a, b) => a - b)
  };
}

async function getDanmu(filters: SearchParams) {
  const supabase = createServerSupabaseClient();

  if (!hasServerSupabaseConfig() || !supabase) {
    return {
      danmu: [],
      options: emptyOptions,
      error: "Configurazione Supabase server mancante. Controlla SUPABASE_SERVICE_ROLE_KEY e riavvia npm run dev."
    };
  }

  const q = filters.q?.trim();
  const serie = filters.serie?.trim();
  const emozione = filters.emozione?.trim();
  const episodio = Number(filters.episodio);

  try {
    const options = await getOptions();
    let query = supabase
      .from("public_danmu")
      .select("*")
      .order("serie_titolo_originale", { ascending: true })
      .order("numero_episodio", { ascending: true, nullsFirst: false })
      .order("timecode_secondi", { ascending: true, nullsFirst: false })
      .limit(150);

    if (q) {
      query = query.or(`testo_originale.ilike.%${q}%,testo_pinyin.ilike.%${q}%,traduzione_italiana.ilike.%${q}%`);
    }

    if (serie) {
      query = query.eq("serie_id", serie);
    }

    if (emozione) {
      query = query.contains("emozioni", [emozione]);
    }

    if (Number.isFinite(episodio) && episodio > 0) {
      query = query.eq("numero_episodio", episodio);
    }

    const { data, error } = await query;

    if (error) {
      return { danmu: [], options, error: error.message };
    }

    return {
      danmu: (data ?? []) as PublicDanmu[],
      options,
      error: null
    };
  } catch (unknownError) {
    const message =
      unknownError instanceof Error
        ? unknownError.message
        : "Errore sconosciuto durante il caricamento dei Danmu.";

    return { danmu: [], options: emptyOptions, error: message };
  }
}

export default async function DanmuPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filters = {
    q: getValue(params.q),
    serie: getValue(params.serie),
    emozione: getValue(params.emozione),
    episodio: getValue(params.episodio)
  };
  const { danmu, options, error } = await getDanmu(filters);

  return (
    <section className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Danmu</h1>
        <p className="mt-3 text-stone-700">
          Commenti Danmu selezionati, sincronizzati agli episodi e pubblicati per la consultazione.
        </p>
      </div>

      <form className="grid gap-3 rounded-md border border-stone-200 bg-white p-4 md:grid-cols-4" action="/danmu">
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-ink">Ricerca</span>
          <input
            name="q"
            defaultValue={filters.q}
            className="rounded-md border border-stone-300 px-3 py-2 text-stone-900 outline-none focus:border-cinnabar"
            placeholder="Commento, pinyin, traduzione"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-ink">Serie</span>
          <select
            name="serie"
            defaultValue={filters.serie}
            className="rounded-md border border-stone-300 px-3 py-2 text-stone-900 outline-none focus:border-cinnabar"
          >
            <option value="">Tutte</option>
            {options.serie.map((serie) => (
              <option key={serie.id} value={serie.id}>
                {serie.titolo_originale}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-ink">Episodio</span>
          <select
            name="episodio"
            defaultValue={filters.episodio}
            className="rounded-md border border-stone-300 px-3 py-2 text-stone-900 outline-none focus:border-cinnabar"
          >
            <option value="">Tutti</option>
            {options.episodi.map((episodio) => (
              <option key={episodio} value={episodio}>
                Ep. {episodio}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-ink">Emozione</span>
          <select
            name="emozione"
            defaultValue={filters.emozione}
            className="rounded-md border border-stone-300 px-3 py-2 text-stone-900 outline-none focus:border-cinnabar"
          >
            <option value="">Tutte</option>
            {options.emozioni.map((emozione) => (
              <option key={emozione} value={emozione}>
                {emozione}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end gap-3 md:col-span-4">
          <button className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-cinnabar">
            Cerca
          </button>
          <a href="/danmu" className="px-2 py-2 text-sm font-medium text-cinnabar hover:text-ink">
            Azzera
          </a>
        </div>
      </form>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Impossibile caricare i Danmu: {error}
        </div>
      ) : null}

      {!error && danmu.length === 0 ? (
        <div className="rounded-md border border-stone-200 bg-white p-5 text-sm text-stone-700">
          Nessun Danmu pubblico trovato con questi filtri.
        </div>
      ) : null}

      {danmu.length > 0 ? (
        <div className="grid gap-4">
          <p className="text-sm text-stone-600">Mostro fino a 150 risultati.</p>
          {danmu.map((item) => (
            <article key={item.id} className="rounded-md border border-stone-200 bg-white p-5">
              <div className="flex flex-wrap gap-2 text-xs text-stone-600">
                <span className="rounded-sm bg-stone-100 px-2 py-1">{item.serie_titolo_originale}</span>
                {item.numero_episodio ? (
                  <span className="rounded-sm bg-stone-100 px-2 py-1">Ep. {item.numero_episodio}</span>
                ) : null}
                {formatTime(item.timecode_secondi) ? (
                  <span className="rounded-sm bg-stone-100 px-2 py-1">{formatTime(item.timecode_secondi)}</span>
                ) : null}
                {item.piattaforma ? <span className="rounded-sm bg-stone-100 px-2 py-1">{item.piattaforma}</span> : null}
                {item.like_ricevuti ? (
                  <span className="rounded-sm bg-stone-100 px-2 py-1">{item.like_ricevuti} like</span>
                ) : null}
              </div>
              <h2 className="mt-4 text-lg font-semibold leading-7 text-ink">{item.testo_originale}</h2>
              {item.testo_pinyin ? <p className="mt-2 text-sm text-stone-600">{item.testo_pinyin}</p> : null}
              {item.traduzione_italiana ? (
                <p className="mt-3 leading-7 text-stone-700">{item.traduzione_italiana}</p>
              ) : null}
              {item.emozioni.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  {item.emozioni.map((emozione) => (
                    <span key={emozione} className="rounded-sm border border-cinnabar/30 px-2 py-1 text-cinnabar">
                      {emozione}
                    </span>
                  ))}
                </div>
              ) : null}
              {item.nota_analisi ? (
                <p className="mt-4 border-l-2 border-stone-200 pl-3 text-sm leading-6 text-stone-600">
                  {item.nota_analisi}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
