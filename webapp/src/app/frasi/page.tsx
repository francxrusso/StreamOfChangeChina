import { getAdminSession } from "@/app/access-actions";
import { QuickAdminActions } from "@/components/quick-admin-actions";
import { type PublicFraseParola, type PublicSerie } from "@/lib/supabase";
import { createServerSupabaseClient, hasServerSupabaseConfig } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

type SearchParams = {
  q?: string;
  serie?: string;
  emozione?: string;
  personaggio?: string;
  status?: string;
  message?: string;
};

type OptionData = {
  serie: PublicSerie[];
  emozioni: string[];
  personaggi: string[];
};

const emptyOptions: OptionData = {
  serie: [],
  emozioni: [],
  personaggi: []
};

type FrasiNotice = {
  status: "success" | "error";
  message: string;
};

function getValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function getNotice(params: Record<string, string | string[] | undefined>): FrasiNotice | null {
  const status = getValue(params.status);
  const message = getValue(params.message);

  if ((status !== "success" && status !== "error") || !message) {
    return null;
  }

  return { status, message };
}

function Notice({ notice }: { notice: FrasiNotice }) {
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

  const [{ data: serie }, { data: frasi }] = await Promise.all([
    supabase.from("public_serie_tv").select("id,titolo_originale").order("titolo_originale", { ascending: true }),
    supabase
      .from("public_frasi_parole")
      .select("emozione_principale,emozioni,personaggio_nome_originale")
      .limit(1000)
  ]);

  const emozioni = new Set<string>();
  const personaggi = new Set<string>();

  for (const item of frasi ?? []) {
    if (item.emozione_principale) {
      emozioni.add(item.emozione_principale);
    }
    for (const emozione of item.emozioni ?? []) {
      emozioni.add(emozione);
    }
    if (item.personaggio_nome_originale) {
      personaggi.add(item.personaggio_nome_originale);
    }
  }

  return {
    serie: (serie ?? []) as PublicSerie[],
    emozioni: [...emozioni].sort((a, b) => a.localeCompare(b, "it")),
    personaggi: [...personaggi].sort((a, b) => a.localeCompare(b, "it"))
  };
}

async function getFrasi(filters: SearchParams) {
  const supabase = createServerSupabaseClient();

  if (!hasServerSupabaseConfig() || !supabase) {
    return {
      frasi: [],
      options: emptyOptions,
      error: "Configurazione Supabase server mancante. Controlla SUPABASE_SERVICE_ROLE_KEY e riavvia npm run dev."
    };
  }

  const q = filters.q?.trim();
  const serie = filters.serie?.trim();
  const emozione = filters.emozione?.trim();
  const personaggio = filters.personaggio?.trim();

  try {
    const options = await getOptions();
    let query = supabase
      .from("public_frasi_parole")
      .select("*")
      .order("serie_titolo_originale", { ascending: true })
      .order("numero_episodio", { ascending: true, nullsFirst: false })
      .order("timecode_inizio_secondi", { ascending: true, nullsFirst: false })
      .limit(100);

    if (q) {
      query = query.or(
        `frase_originale.ilike.%${q}%,frase_pinyin.ilike.%${q}%,traduzione_italiana.ilike.%${q}%,parola_chiave.ilike.%${q}%`
      );
    }

    if (serie) {
      query = query.eq("serie_id", serie);
    }

    if (emozione) {
      query = query.contains("emozioni", [emozione]);
    }

    if (personaggio) {
      query = query.eq("personaggio_nome_originale", personaggio);
    }

    const { data, error } = await query;

    if (error) {
      return { frasi: [], options, error: error.message };
    }

    return {
      frasi: (data ?? []) as PublicFraseParola[],
      options,
      error: null
    };
  } catch (unknownError) {
    const message =
      unknownError instanceof Error
        ? unknownError.message
        : "Errore sconosciuto durante il caricamento del lessico.";

    return { frasi: [], options: emptyOptions, error: message };
  }
}

export default async function FrasiPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filters = {
    q: getValue(params.q),
    serie: getValue(params.serie),
    emozione: getValue(params.emozione),
    personaggio: getValue(params.personaggio)
  };
  const notice = getNotice(params);
  const session = await getAdminSession();
  const { frasi, options, error } = await getFrasi(filters);
  const returnParams = new URLSearchParams();

  if (filters.q) returnParams.set("q", filters.q);
  if (filters.serie) returnParams.set("serie", filters.serie);
  if (filters.emozione) returnParams.set("emozione", filters.emozione);
  if (filters.personaggio) returnParams.set("personaggio", filters.personaggio);

  const returnTo = `/frasi${returnParams.toString() ? `?${returnParams.toString()}` : ""}`;

  return (
    <section className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Lessico</h1>
        <p className="mt-3 text-stone-700">
          Ricerca frasi, parole ed espressioni annotate nelle trascrizioni, con collegamenti a serie, episodi, personaggi ed emozioni.
        </p>
      </div>

      <form className="grid gap-3 rounded-md border border-stone-200 bg-white p-4 md:grid-cols-4" action="/frasi">
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-ink">Ricerca</span>
          <input
            name="q"
            defaultValue={filters.q}
            className="rounded-md border border-stone-300 px-3 py-2 text-stone-900 outline-none focus:border-cinnabar"
            placeholder="Frase, traduzione, parola"
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
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-ink">Personaggio</span>
          <select
            name="personaggio"
            defaultValue={filters.personaggio}
            className="rounded-md border border-stone-300 px-3 py-2 text-stone-900 outline-none focus:border-cinnabar"
          >
            <option value="">Tutti</option>
            {options.personaggi.map((personaggio) => (
              <option key={personaggio} value={personaggio}>
                {personaggio}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end gap-3 md:col-span-4">
          <button className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-cinnabar">
            Cerca
          </button>
          <a href="/frasi" className="px-2 py-2 text-sm font-medium text-cinnabar hover:text-ink">
            Azzera
          </a>
        </div>
      </form>

      {notice ? <Notice notice={notice} /> : null}

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Impossibile caricare il lessico: {error}
        </div>
      ) : null}

      {!error && frasi.length === 0 ? (
        <div className="rounded-md border border-stone-200 bg-white p-5 text-sm text-stone-700">
          Nessun elemento lessicale trovato con questi filtri.
        </div>
      ) : null}

      {frasi.length > 0 ? (
        <div className="grid gap-4">
          <p className="text-sm text-stone-600">Mostro fino a 100 risultati.</p>
          {frasi.map((frase) => (
            <article key={frase.id} className="rounded-md border border-stone-200 bg-white p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-wrap gap-2 text-xs text-stone-600">
                  <span className="rounded-sm bg-stone-100 px-2 py-1">{frase.serie_titolo_originale}</span>
                  {frase.numero_episodio ? (
                    <span className="rounded-sm bg-stone-100 px-2 py-1">Ep. {frase.numero_episodio}</span>
                  ) : null}
                  {formatTime(frase.timecode_inizio_secondi) ? (
                    <span className="rounded-sm bg-stone-100 px-2 py-1">
                      {formatTime(frase.timecode_inizio_secondi)}
                    </span>
                  ) : null}
                  {frase.tipo ? <span className="rounded-sm bg-stone-100 px-2 py-1">{frase.tipo}</span> : null}
                </div>
                {session?.canEdit ? (
                  <QuickAdminActions
                    resource="frasi"
                    id={frase.id}
                    title={frase.frase_originale}
                    returnTo={returnTo}
                    fields={[
                      {
                        name: "tipo",
                        label: "Tipo",
                        type: "select",
                        value: frase.tipo,
                        options: [
                          { value: "Frase", label: "Frase" },
                          { value: "Parola", label: "Parola" },
                          { value: "Espressione", label: "Espressione" }
                        ]
                      },
                      { name: "frase_originale", label: "Frase originale", type: "textarea", value: frase.frase_originale },
                      { name: "frase_pinyin", label: "Pinyin", type: "textarea", value: frase.frase_pinyin },
                      { name: "traduzione_italiana", label: "Traduzione italiana", type: "textarea", value: frase.traduzione_italiana },
                      { name: "parola_chiave", label: "Parola chiave", value: frase.parola_chiave },
                      { name: "nota_analisi", label: "Nota analisi", type: "textarea", value: frase.nota_analisi }
                    ]}
                  />
                ) : null}
              </div>
              <h2 className="mt-4 text-lg font-semibold leading-7 text-ink">{frase.frase_originale}</h2>
              {frase.frase_pinyin ? <p className="mt-2 text-sm text-stone-600">{frase.frase_pinyin}</p> : null}
              {frase.traduzione_italiana ? (
                <p className="mt-3 leading-7 text-stone-700">{frase.traduzione_italiana}</p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                {frase.personaggio_nome_originale ? (
                  <span className="rounded-sm border border-stone-200 px-2 py-1 text-stone-700">
                    {frase.personaggio_nome_originale}
                  </span>
                ) : null}
                {(frase.emozioni.length > 0 ? frase.emozioni : frase.emozione_principale ? [frase.emozione_principale] : []).map(
                  (emozione) => (
                    <span key={emozione} className="rounded-sm border border-cinnabar/30 px-2 py-1 text-cinnabar">
                      {emozione}
                    </span>
                  )
                )}
              </div>
              {frase.nota_analisi ? (
                <p className="mt-4 border-l-2 border-stone-200 pl-3 text-sm leading-6 text-stone-600">
                  {frase.nota_analisi}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
