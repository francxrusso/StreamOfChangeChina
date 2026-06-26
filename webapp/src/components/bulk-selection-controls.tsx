"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Save, Table2, X } from "lucide-react";
import { bulkUpdateEpisodeRows } from "@/app/bulk-admin-actions";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { type PublicEpisodio } from "@/lib/supabase";

function getBulkCheckboxes(formId: string) {
  return Array.from(document.querySelectorAll<HTMLInputElement>('input[name="selected_ids"]')).filter(
    (input) => input.getAttribute("form") === formId
  );
}

function toInputValue(value: string | number | null | undefined) {
  return value === null || value === undefined ? "" : String(value);
}

function toDateInputValue(value: string | null | undefined) {
  return value ? value.slice(0, 10) : "";
}

export function SelectAllCheckbox({ formId, label }: { formId: string; label: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [total, setTotal] = useState(0);
  const [checkedCount, setCheckedCount] = useState(0);

  const refresh = useCallback(() => {
    const checkboxes = getBulkCheckboxes(formId);
    setTotal(checkboxes.length);
    setCheckedCount(checkboxes.filter((checkbox) => checkbox.checked).length);
  }, [formId]);

  useEffect(() => {
    refresh();

    const handleChange = () => refresh();
    document.addEventListener("change", handleChange);

    return () => {
      document.removeEventListener("change", handleChange);
    };
  }, [refresh]);

  useEffect(() => {
    if (!inputRef.current) {
      return;
    }

    inputRef.current.indeterminate = checkedCount > 0 && checkedCount < total;
  }, [checkedCount, total]);

  const allChecked = total > 0 && checkedCount === total;

  return (
    <label className="inline-flex items-center gap-2 rounded-md border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-ink">
      <input
        ref={inputRef}
        type="checkbox"
        checked={allChecked}
        className="h-4 w-4 rounded border-stone-300 text-cinnabar"
        onChange={(event) => {
          getBulkCheckboxes(formId).forEach((checkbox) => {
            checkbox.checked = event.currentTarget.checked;
          });
          refresh();
        }}
      />
      {label}
      <span className="rounded-sm bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">
        {checkedCount}/{total}
      </span>
    </label>
  );
}

export function BulkEpisodeTableEditor({
  formId,
  returnTo,
  episodes
}: {
  formId: string;
  returnTo: string;
  episodes: PublicEpisodio[];
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const refreshSelection = useCallback(() => {
    setSelectedIds(getBulkCheckboxes(formId).filter((checkbox) => checkbox.checked).map((checkbox) => checkbox.value));
  }, [formId]);

  useEffect(() => {
    refreshSelection();

    const handleChange = () => refreshSelection();
    document.addEventListener("change", handleChange);

    return () => {
      document.removeEventListener("change", handleChange);
    };
  }, [refreshSelection]);

  const selectedEpisodes = useMemo(() => {
    const selected = new Set(selectedIds);
    return episodes.filter((episode) => selected.has(episode.id));
  }, [episodes, selectedIds]);

  return (
    <div className="grid gap-3 rounded-md border border-stone-200 bg-stone-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold uppercase text-cinnabar">Modifica episodi in bulk</h3>
          <p className="mt-1 text-sm text-stone-600">
            Seleziona gli episodi e apri la vista tabellare per modificare i campi cella per cella.
          </p>
        </div>
        <SelectAllCheckbox formId={formId} label="Seleziona tutti gli episodi visibili" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={selectedIds.length === 0}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-cinnabar disabled:cursor-not-allowed disabled:bg-stone-300"
          onClick={() => {
            refreshSelection();
            setIsOpen(true);
          }}
        >
          <Table2 size={16} aria-hidden="true" />
          Apri modifica tabellare
        </button>
        <span className="text-sm text-stone-600">
          {selectedIds.length === 0 ? "Nessun episodio selezionato." : `${selectedIds.length} episodi selezionati.`}
        </span>
      </div>

      {isOpen ? (
        <div className="fixed inset-0 z-50 bg-ink/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Modifica tabellare episodi"
            className="mx-auto flex max-h-[92vh] max-w-7xl flex-col overflow-hidden rounded-md bg-white shadow-2xl"
          >
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-stone-200 px-5 py-4">
              <div>
                <h3 className="text-lg font-semibold text-ink">Modifica tabellare episodi</h3>
                <p className="mt-1 text-sm text-stone-600">
                  Ogni riga salva i dati dell'episodio corrispondente. I campi vuoti vengono salvati come vuoti.
                </p>
              </div>
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-stone-200 text-stone-700 hover:border-cinnabar hover:text-cinnabar"
                onClick={() => setIsOpen(false)}
                aria-label="Chiudi modifica tabellare"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            {selectedEpisodes.length === 0 ? (
              <div className="p-5 text-sm text-stone-700">Non ci sono episodi selezionati da modificare.</div>
            ) : (
              <form id={formId} action={bulkUpdateEpisodeRows} className="flex min-h-0 flex-1 flex-col">
                <input type="hidden" name="return_to" value={returnTo} />
                <div className="min-h-0 flex-1 overflow-auto p-4">
                  <table className="min-w-[2300px] border-separate border-spacing-0 text-left text-sm">
                    <thead className="sticky top-0 z-10 bg-stone-100 text-xs uppercase text-stone-600">
                      <tr>
                        <th className="border-b border-stone-200 px-3 py-2">Stagione</th>
                        <th className="border-b border-stone-200 px-3 py-2">Episodio</th>
                        <th className="border-b border-stone-200 px-3 py-2">Titolo originale</th>
                        <th className="border-b border-stone-200 px-3 py-2">Pinyin</th>
                        <th className="border-b border-stone-200 px-3 py-2">Titolo italiano</th>
                        <th className="border-b border-stone-200 px-3 py-2">Messa in onda</th>
                        <th className="border-b border-stone-200 px-3 py-2">Durata sec.</th>
                        <th className="border-b border-stone-200 px-3 py-2">Visibilita</th>
                        <th className="border-b border-stone-200 px-3 py-2">Link episodio</th>
                        <th className="border-b border-stone-200 px-3 py-2">Descrizione</th>
                        <th className="border-b border-stone-200 px-3 py-2">Trama / sintesi</th>
                        <th className="border-b border-stone-200 px-3 py-2">Trascrizione</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedEpisodes.map((episode) => (
                        <tr key={episode.id} className="align-top">
                          <td className="border-b border-stone-100 px-3 py-2">
                            <input type="hidden" name="episode_ids" value={episode.id} />
                            <input
                              name={`stagione_${episode.id}`}
                              type="number"
                              min={1}
                              defaultValue={toInputValue(episode.stagione)}
                              className="w-20 rounded-md border border-stone-300 px-2 py-1.5 outline-none focus:border-cinnabar"
                            />
                          </td>
                          <td className="border-b border-stone-100 px-3 py-2">
                            <input
                              name={`numero_episodio_${episode.id}`}
                              type="number"
                              min={1}
                              defaultValue={toInputValue(episode.numero_episodio)}
                              className="w-20 rounded-md border border-stone-300 px-2 py-1.5 outline-none focus:border-cinnabar"
                            />
                          </td>
                          <td className="border-b border-stone-100 px-3 py-2">
                            <input
                              name={`titolo_originale_${episode.id}`}
                              defaultValue={toInputValue(episode.titolo_originale)}
                              className="w-56 rounded-md border border-stone-300 px-2 py-1.5 outline-none focus:border-cinnabar"
                            />
                          </td>
                          <td className="border-b border-stone-100 px-3 py-2">
                            <input
                              name={`titolo_pinyin_${episode.id}`}
                              defaultValue={toInputValue(episode.titolo_pinyin)}
                              className="w-56 rounded-md border border-stone-300 px-2 py-1.5 outline-none focus:border-cinnabar"
                            />
                          </td>
                          <td className="border-b border-stone-100 px-3 py-2">
                            <input
                              name={`titolo_italiano_${episode.id}`}
                              defaultValue={toInputValue(episode.titolo_italiano)}
                              className="w-56 rounded-md border border-stone-300 px-2 py-1.5 outline-none focus:border-cinnabar"
                            />
                          </td>
                          <td className="border-b border-stone-100 px-3 py-2">
                            <input
                              name={`messa_in_onda_${episode.id}`}
                              type="date"
                              defaultValue={toDateInputValue(episode.messa_in_onda)}
                              className="w-40 rounded-md border border-stone-300 px-2 py-1.5 outline-none focus:border-cinnabar"
                            />
                          </td>
                          <td className="border-b border-stone-100 px-3 py-2">
                            <input
                              name={`durata_secondi_${episode.id}`}
                              type="number"
                              min={0}
                              defaultValue={toInputValue(episode.durata_secondi)}
                              className="w-28 rounded-md border border-stone-300 px-2 py-1.5 outline-none focus:border-cinnabar"
                            />
                          </td>
                          <td className="border-b border-stone-100 px-3 py-2">
                            <select
                              name={`visibility_${episode.id}`}
                              defaultValue="public"
                              className="w-28 rounded-md border border-stone-300 px-2 py-1.5 outline-none focus:border-cinnabar"
                            >
                              <option value="public">public</option>
                              <option value="private">private</option>
                            </select>
                          </td>
                          <td className="border-b border-stone-100 px-3 py-2">
                            <input
                              name={`link_episodio_${episode.id}`}
                              defaultValue={toInputValue(episode.link_episodio)}
                              className="w-72 rounded-md border border-stone-300 px-2 py-1.5 outline-none focus:border-cinnabar"
                            />
                          </td>
                          <td className="border-b border-stone-100 px-3 py-2">
                            <textarea
                              name={`descrizione_${episode.id}`}
                              defaultValue={toInputValue(episode.descrizione)}
                              className="min-h-24 w-72 rounded-md border border-stone-300 px-2 py-1.5 outline-none focus:border-cinnabar"
                            />
                          </td>
                          <td className="border-b border-stone-100 px-3 py-2">
                            <textarea
                              name={`sintesi_automatica_${episode.id}`}
                              defaultValue={toInputValue(episode.sintesi_automatica)}
                              className="min-h-24 w-80 rounded-md border border-stone-300 px-2 py-1.5 outline-none focus:border-cinnabar"
                            />
                          </td>
                          <td className="border-b border-stone-100 px-3 py-2">
                            <textarea
                              name={`trascrizione_${episode.id}`}
                              defaultValue={toInputValue(episode.trascrizione)}
                              className="min-h-24 w-96 rounded-md border border-stone-300 px-2 py-1.5 outline-none focus:border-cinnabar"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 px-5 py-4">
                  <span className="text-sm text-stone-600">{selectedEpisodes.length} righe pronte per il salvataggio.</span>
                  <PendingSubmitButton
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-cinnabar px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-wait disabled:bg-red-700/70"
                  >
                    <Save size={16} aria-hidden="true" />
                    Salva modifiche bulk
                  </PendingSubmitButton>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
