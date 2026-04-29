import Link from "next/link";

export default function HomePage() {
  return (
    <div className="grid gap-10">
      <section className="max-w-3xl">
        <p className="mb-3 text-sm font-medium uppercase text-cinnabar">
          Stream of Change in China
        </p>
        <h1 className="text-4xl font-semibold text-ink">
          Archivio digitale per serie, trascrizioni, emozioni e Danmu.
        </h1>
        <p className="mt-5 text-lg leading-8 text-stone-700">
          Una piattaforma di consultazione per serie, trascrizioni, commenti Danmu e annotazioni emotive.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Link href="/serie" className="rounded-md border border-stone-200 bg-white p-5 hover:border-cinnabar">
          <h2 className="font-semibold text-ink">Serie TV</h2>
          <p className="mt-2 text-sm leading-6 text-stone-600">Catalogo delle opere e degli episodi.</p>
        </Link>
        <Link href="/frasi" className="rounded-md border border-stone-200 bg-white p-5 hover:border-cinnabar">
          <h2 className="font-semibold text-ink">Frasi</h2>
          <p className="mt-2 text-sm leading-6 text-stone-600">Lessico, battute e traduzioni annotate.</p>
        </Link>
        <Link href="/danmu" className="rounded-md border border-stone-200 bg-white p-5 hover:border-cinnabar">
          <h2 className="font-semibold text-ink">Danmu</h2>
          <p className="mt-2 text-sm leading-6 text-stone-600">Commenti sincronizzati e selezioni pubbliche.</p>
        </Link>
      </section>
    </div>
  );
}
