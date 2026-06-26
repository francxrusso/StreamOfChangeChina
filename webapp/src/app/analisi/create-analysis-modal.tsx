"use client";

import { useMemo, useState } from "react";
import { BarChart3, Plus, X } from "lucide-react";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { createAnalysisRun } from "./actions";

export type AnalysisSerieOption = {
  id: string;
  titolo_originale: string;
};

export type AnalysisEpisodeOption = {
  id: string;
  serie_id: string;
  stagione: number | null;
  numero_episodio: number | null;
  titolo_originale: string | null;
};

type CreateAnalysisModalProps = {
  series: AnalysisSerieOption[];
  episodes: AnalysisEpisodeOption[];
};

export function CreateAnalysisModal({ series, episodes }: CreateAnalysisModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSerie, setSelectedSerie] = useState(series[0]?.id ?? "");
  const [scope, setScope] = useState("serie");

  const serieEpisodes = useMemo(
    () => episodes.filter((episode) => episode.serie_id === selectedSerie),
    [episodes, selectedSerie]
  );
  const seasons = useMemo(
    () =>
      [...new Set(serieEpisodes.map((episode) => episode.stagione).filter((season): season is number => season !== null))]
        .sort((a, b) => a - b),
    [serieEpisodes]
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center justify-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-cinnabar"
      >
        <Plus size={16} aria-hidden="true" />
        Crea nuova analisi
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/45 px-4 py-6">
          <div
            className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-md border border-stone-200 bg-white p-5 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-analysis-title"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="create-analysis-title" className="text-lg font-semibold text-ink">
                  Crea nuova analisi
                </h2>
                <p className="mt-1 text-sm text-stone-600">
                  Scegli la base testuale e il tipo di visualizzazione da salvare nella dashboard.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-md p-2 text-stone-500 hover:bg-stone-100 hover:text-ink"
                aria-label="Chiudi"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <form action={createAnalysisRun} className="mt-5 grid gap-5">
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-ink">Serie</span>
                <select
                  name="serie_id"
                  required
                  value={selectedSerie}
                  onChange={(event) => setSelectedSerie(event.target.value)}
                  className="rounded-md border border-stone-300 px-3 py-2 text-stone-900 outline-none focus:border-cinnabar"
                >
                  {series.map((serie) => (
                    <option key={serie.id} value={serie.id}>
                      {serie.titolo_originale}
                    </option>
                  ))}
                </select>
              </label>

              <fieldset className="grid gap-3">
                <legend className="text-sm font-medium text-ink">Base dell'analisi</legend>
                <div className="grid gap-3 md:grid-cols-3">
                  {[
                    ["serie", "Tutta la serie"],
                    ["stagioni", "Stagioni specifiche"],
                    ["episodi", "Episodi specifici"]
                  ].map(([value, label]) => (
                    <label key={value} className="flex items-center gap-2 rounded-md border border-stone-200 px-3 py-2 text-sm">
                      <input
                        type="radio"
                        name="scope_tipo"
                        value={value}
                        checked={scope === value}
                        onChange={() => setScope(value)}
                        className="h-4 w-4 border-stone-300 text-cinnabar"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>

              {scope === "stagioni" ? (
                <label className="grid gap-1 text-sm">
                  <span className="font-medium text-ink">Stagioni</span>
                  <select
                    name="stagioni"
                    multiple
                    size={Math.min(Math.max(seasons.length, 3), 6)}
                    className="rounded-md border border-stone-300 px-3 py-2 text-stone-900 outline-none focus:border-cinnabar"
                  >
                    {seasons.map((season) => (
                      <option key={season} value={season}>
                        Stagione {season}
                      </option>
                    ))}
                  </select>
                  <span className="text-xs text-stone-500">Tieni premuto Cmd/Ctrl per selezionare piu stagioni.</span>
                </label>
              ) : null}

              {scope === "episodi" ? (
                <label className="grid gap-1 text-sm">
                  <span className="font-medium text-ink">Episodi</span>
                  <select
                    name="episodio_ids"
                    multiple
                    size={Math.min(Math.max(serieEpisodes.length, 5), 10)}
                    className="rounded-md border border-stone-300 px-3 py-2 text-stone-900 outline-none focus:border-cinnabar"
                  >
                    {serieEpisodes.map((episode) => (
                      <option key={episode.id} value={episode.id}>
                        S{episode.stagione ?? "-"} E{episode.numero_episodio ?? "-"} - {episode.titolo_originale ?? "Senza titolo"}
                      </option>
                    ))}
                  </select>
                  <span className="text-xs text-stone-500">Tieni premuto Cmd/Ctrl per selezionare piu episodi.</span>
                </label>
              ) : null}

              <fieldset className="grid gap-3">
                <legend className="text-sm font-medium text-ink">Output</legend>
                <label className="flex items-center gap-3 rounded-md border border-stone-200 px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    name="output_grafici"
                    value="true"
                    defaultChecked
                    className="h-4 w-4 rounded border-stone-300 text-cinnabar"
                  />
                  <span className="inline-flex items-center gap-2">
                    <BarChart3 size={16} aria-hidden="true" />
                    Includi grafici nel dettaglio
                  </span>
                </label>
              </fieldset>

              <div className="flex flex-wrap justify-end gap-3 border-t border-stone-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-md border border-stone-300 px-4 py-2 text-sm font-semibold text-ink hover:border-cinnabar hover:text-cinnabar"
                >
                  Annulla
                </button>
                <PendingSubmitButton
                  pendingText="Creazione..."
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-cinnabar px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-wait disabled:bg-red-700/70"
                >
                  Crea analisi
                </PendingSubmitButton>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
