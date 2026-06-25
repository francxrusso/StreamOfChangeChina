import Image from "next/image";
import Link from "next/link";
import {
  BookOpen,
  Brain,
  Captions,
  Clapperboard,
  Database,
  HeartPulse,
  MessageSquareText,
  PencilLine,
  ShieldCheck,
  Users
} from "lucide-react";
import { createServerSupabaseClient, hasServerSupabaseConfig } from "@/lib/supabase-server";
import { formatSerieGenreLabels } from "@/lib/serie-genres";

type HomeStats = {
  serie: number;
  episodi: number;
  personaggi: number;
  emozioni: number;
  frasi: number;
  danmu: number;
  analisi: number;
};

type RecentSerie = {
  id: string;
  titolo_originale: string;
  titolo_inglese: string | null;
  anno: number | null;
  genere: string | null;
};

const emptyStats: HomeStats = {
  serie: 0,
  episodi: 0,
  personaggi: 0,
  emozioni: 0,
  frasi: 0,
  danmu: 0,
  analisi: 0
};

async function getHomeData() {
  const supabase = createServerSupabaseClient();

  if (!hasServerSupabaseConfig() || !supabase) {
    return {
      stats: emptyStats,
      recentSerie: [] as RecentSerie[],
      error: "Configurazione Supabase server mancante."
    };
  }

  const [
    serie,
    episodi,
    personaggi,
    emozioni,
    frasi,
    danmu,
    analisi,
    recentSerie
  ] = await Promise.all([
    supabase.from("serie_tv").select("*", { count: "exact", head: true }),
    supabase.from("episodi").select("*", { count: "exact", head: true }),
    supabase.from("personaggi").select("*", { count: "exact", head: true }),
    supabase.from("emozioni").select("*", { count: "exact", head: true }),
    supabase.from("frasi_parole").select("*", { count: "exact", head: true }),
    supabase.from("danmu").select("*", { count: "exact", head: true }),
    supabase.from("analisi_episodi").select("*", { count: "exact", head: true }),
    supabase
      .from("serie_tv")
      .select("id,titolo_originale,titolo_inglese,anno,genere")
      .order("updated_at", { ascending: false })
      .limit(5)
  ]);

  const firstError =
    serie.error ??
    episodi.error ??
    personaggi.error ??
    emozioni.error ??
    frasi.error ??
    danmu.error ??
    analisi.error ??
    recentSerie.error;

  if (firstError) {
    return {
      stats: emptyStats,
      recentSerie: [] as RecentSerie[],
      error: firstError.message
    };
  }

  return {
    stats: {
      serie: serie.count ?? 0,
      episodi: episodi.count ?? 0,
      personaggi: personaggi.count ?? 0,
      emozioni: emozioni.count ?? 0,
      frasi: frasi.count ?? 0,
      danmu: danmu.count ?? 0,
      analisi: analisi.count ?? 0
    },
    recentSerie: (recentSerie.data ?? []) as RecentSerie[],
    error: null
  };
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("it-IT").format(value);
}

export default async function HomePage() {
  const { stats, recentSerie, error } = await getHomeData();

  const metrics = [
    { label: "Serie", value: stats.serie, icon: Clapperboard, href: "/serie", tone: "text-cinnabar" },
    { label: "Episodi", value: stats.episodi, icon: BookOpen, href: "/serie", tone: "text-indigo" },
    { label: "Personaggi", value: stats.personaggi, icon: Users, href: "/admin?tab=personaggi", tone: "text-jade" },
    { label: "Emozioni", value: stats.emozioni, icon: HeartPulse, href: "/emozioni", tone: "text-rose-700" },
    { label: "Lessico", value: stats.frasi, icon: Captions, href: "/frasi", tone: "text-amber-700" },
    { label: "Danmu", value: stats.danmu, icon: MessageSquareText, href: "/danmu", tone: "text-sky-700" },
    { label: "Analisi", value: stats.analisi, icon: Brain, href: "/analisi", tone: "text-violet-700" }
  ];

  const quickLinks = [
    { href: "/admin?tab=serie", label: "Nuova serie", detail: "Aggiungi metadati e visibilita", icon: Clapperboard },
    { href: "/admin?tab=episodi", label: "Nuovo episodio", detail: "Trascrizione, sintesi e note", icon: BookOpen },
    { href: "/admin?tab=frasi", label: "Nuovo elemento lessico", detail: "Annota frasi, parole, traduzioni ed emozioni", icon: Captions },
    { href: "/analisi", label: "Analizza trascrizione", detail: "Frequenze, ricorrenze e parole chiave", icon: Brain },
    { href: "/admin?tab=personaggi", label: "Nuovo personaggio", detail: "Ruolo, genere, fascia d'eta, lavoro", icon: Users },
    { href: "/admin/utenti", label: "Gestisci utenti", detail: "Accessi, password e permessi", icon: ShieldCheck }
  ];

  return (
    <div className="grid gap-8">
      <section className="grid gap-8 border-b border-stone-200 pb-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
        <div>
          <Image
            src="/brand/logo.png"
            alt="Stream of Change China"
            width={2388}
            height={550}
            priority
            className="h-auto w-full max-w-lg"
          />
          <h1 className="mt-8 max-w-3xl text-4xl font-semibold leading-tight text-ink">
            Workspace riservato per corpus, trascrizioni, emozioni e Danmu.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-stone-700">
            Consulta il materiale, controlla la copertura dei dati e aggiorna le annotazioni editoriali da un unico punto.
          </p>
        </div>
        <div className="grid gap-3 rounded-lg border border-stone-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-stone-100 text-cinnabar">
              <Database size={20} aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-semibold text-ink">Stato database</h2>
              <p className="text-sm text-stone-600">Dati letti via service role server-side.</p>
            </div>
          </div>
          {error ? (
            <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              Impossibile caricare le metriche: {error}
            </p>
          ) : (
            <p className="text-sm leading-6 text-stone-700">
              Il corpus e' accessibile solo dopo login. Le viste Supabase anonime sono bloccate.
            </p>
          )}
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-cinnabar"
          >
            <PencilLine size={16} aria-hidden="true" />
            Apri admin
          </Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map((metric) => {
          const Icon = metric.icon;

          return (
            <Link
              key={metric.label}
              href={metric.href}
              className="rounded-lg border border-stone-200 bg-white p-4 transition hover:border-cinnabar"
            >
              <div className="flex items-center justify-between gap-4">
                <span className={`flex h-10 w-10 items-center justify-center rounded-md bg-stone-100 ${metric.tone}`}>
                  <Icon size={20} aria-hidden="true" />
                </span>
                <span className="text-2xl font-semibold text-ink">{formatNumber(metric.value)}</span>
              </div>
              <p className="mt-4 text-sm font-medium text-stone-700">{metric.label}</p>
            </Link>
          );
        })}
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div>
          <div className="mb-3 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-ink">Azioni rapide</h2>
              <p className="mt-1 text-sm text-stone-600">Entrate dirette ai flussi editoriali piu' frequenti.</p>
            </div>
          </div>
          <div className="grid gap-3">
            {quickLinks.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-4 rounded-lg border border-stone-200 bg-white p-4 hover:border-cinnabar"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-stone-100 text-cinnabar">
                    <Icon size={20} aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold text-ink">{item.label}</span>
                    <span className="mt-1 block text-sm text-stone-600">{item.detail}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-ink">Serie aggiornate</h2>
              <p className="mt-1 text-sm text-stone-600">Ultime schede modificate nel corpus.</p>
            </div>
            <Link href="/serie" className="text-sm font-semibold text-cinnabar hover:text-ink">
              Vedi tutte
            </Link>
          </div>
          <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
            {recentSerie.length === 0 ? (
              <p className="p-5 text-sm text-stone-600">Nessuna serie disponibile.</p>
            ) : (
              recentSerie.map((serie, index) => (
                <Link
                  key={serie.id}
                  href={`/serie/${serie.id}`}
                  className={`grid gap-2 p-4 hover:bg-stone-50 sm:grid-cols-[1fr_auto] ${
                    index > 0 ? "border-t border-stone-200" : ""
                  }`}
                >
                  <span>
                    <span className="block font-semibold text-ink">{serie.titolo_originale}</span>
                    {serie.titolo_inglese ? (
                      <span className="mt-1 block text-sm text-stone-600">{serie.titolo_inglese}</span>
                    ) : null}
                  </span>
                  <span className="flex flex-wrap items-start gap-2 text-xs text-stone-600 sm:justify-end">
                    {serie.anno ? <span className="rounded-sm bg-stone-100 px-2 py-1">{serie.anno}</span> : null}
                    {serie.genere ? (
                      <span className="rounded-sm bg-stone-100 px-2 py-1">
                        {formatSerieGenreLabels(serie.genere)}
                      </span>
                    ) : null}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
