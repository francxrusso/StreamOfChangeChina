"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { createEpisodeLessico } from "./actions";

type Option = {
  id: string;
  label: string;
};

type QuickLessicoModalProps = {
  episodeId: string;
  serieId: string;
  personaggi: Option[];
  emozioni: Option[];
};

export function QuickLessicoModal({ episodeId, serieId, personaggi, emozioni }: QuickLessicoModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-ink hover:border-cinnabar hover:text-cinnabar"
      >
        <Plus size={16} aria-hidden="true" />
        Aggiungi lessico
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/45 px-4 py-6">
          <div
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-md border border-stone-200 bg-white p-5 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-lessico-title"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="quick-lessico-title" className="text-lg font-semibold text-ink">
                  Nuovo lessico
                </h2>
                <p className="mt-1 text-sm text-stone-600">
                  Aggiungi una parola, frase o espressione collegata a questo episodio.
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

            <form action={createEpisodeLessico} className="mt-5 grid gap-4">
              <input type="hidden" name="episodio_id" value={episodeId} />
              <input type="hidden" name="serie_id" value={serieId} />

              <label className="grid gap-1 text-sm">
                <span className="font-medium text-ink">Testo originale</span>
                <textarea
                  name="frase_originale"
                  required
                  rows={3}
                  className="rounded-md border border-stone-300 px-3 py-2 text-stone-900 outline-none focus:border-cinnabar"
                  placeholder="Inserisci frase, parola o espressione in cinese"
                />
              </label>

              <div className="grid gap-4 md:grid-cols-3">
                <label className="grid gap-1 text-sm">
                  <span className="font-medium text-ink">Tipo</span>
                  <select
                    name="tipo"
                    defaultValue="Frase"
                    className="rounded-md border border-stone-300 px-3 py-2 text-stone-900 outline-none focus:border-cinnabar"
                  >
                    <option value="Frase">Frase</option>
                    <option value="Parola">Parola</option>
                    <option value="Espressione">Espressione</option>
                  </select>
                </label>

                <label className="grid gap-1 text-sm">
                  <span className="font-medium text-ink">Inizio</span>
                  <input
                    name="timecode_inizio_secondi"
                    inputMode="decimal"
                    className="rounded-md border border-stone-300 px-3 py-2 text-stone-900 outline-none focus:border-cinnabar"
                    placeholder="Secondi"
                  />
                </label>

                <label className="grid gap-1 text-sm">
                  <span className="font-medium text-ink">Fine</span>
                  <input
                    name="timecode_fine_secondi"
                    inputMode="decimal"
                    className="rounded-md border border-stone-300 px-3 py-2 text-stone-900 outline-none focus:border-cinnabar"
                    placeholder="Secondi"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-1 text-sm">
                  <span className="font-medium text-ink">Pinyin</span>
                  <textarea
                    name="frase_pinyin"
                    rows={2}
                    className="rounded-md border border-stone-300 px-3 py-2 text-stone-900 outline-none focus:border-cinnabar"
                    placeholder="Lascia vuoto per generarlo automaticamente"
                  />
                </label>

                <label className="grid gap-1 text-sm">
                  <span className="font-medium text-ink">Traduzione italiana</span>
                  <textarea
                    name="traduzione_italiana"
                    rows={2}
                    className="rounded-md border border-stone-300 px-3 py-2 text-stone-900 outline-none focus:border-cinnabar"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-1 text-sm">
                  <span className="font-medium text-ink">Personaggio</span>
                  <select
                    name="personaggio_id"
                    defaultValue=""
                    className="rounded-md border border-stone-300 px-3 py-2 text-stone-900 outline-none focus:border-cinnabar"
                  >
                    <option value="">Nessuno</option>
                    {personaggi.map((personaggio) => (
                      <option key={personaggio.id} value={personaggio.id}>
                        {personaggio.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-1 text-sm">
                  <span className="font-medium text-ink">Emozioni</span>
                  <select
                    name="emozione_ids"
                    multiple
                    size={Math.min(Math.max(emozioni.length, 3), 6)}
                    className="rounded-md border border-stone-300 px-3 py-2 text-stone-900 outline-none focus:border-cinnabar"
                  >
                    {emozioni.map((emozione) => (
                      <option key={emozione.id} value={emozione.id}>
                        {emozione.label}
                      </option>
                    ))}
                  </select>
                  <span className="text-xs text-stone-500">Tieni premuto Cmd/Ctrl per selezionare piu emozioni.</span>
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-1 text-sm">
                  <span className="font-medium text-ink">Parola chiave</span>
                  <input
                    name="parola_chiave"
                    className="rounded-md border border-stone-300 px-3 py-2 text-stone-900 outline-none focus:border-cinnabar"
                  />
                </label>

                <label className="grid gap-1 text-sm">
                  <span className="font-medium text-ink">Visibilita</span>
                  <select
                    name="visibility"
                    defaultValue="public"
                    className="rounded-md border border-stone-300 px-3 py-2 text-stone-900 outline-none focus:border-cinnabar"
                  >
                    <option value="public">Pubblico</option>
                    <option value="private">Privato</option>
                  </select>
                </label>
              </div>

              <label className="grid gap-1 text-sm">
                <span className="font-medium text-ink">Nota analisi</span>
                <textarea
                  name="nota_analisi"
                  rows={3}
                  className="rounded-md border border-stone-300 px-3 py-2 text-stone-900 outline-none focus:border-cinnabar"
                />
              </label>

              <div className="flex flex-wrap justify-end gap-3 border-t border-stone-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-md border border-stone-300 px-4 py-2 text-sm font-semibold text-ink hover:border-cinnabar hover:text-cinnabar"
                >
                  Annulla
                </button>
                <PendingSubmitButton
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-cinnabar disabled:cursor-wait disabled:bg-ink/70"
                >
                  Salva lessico
                </PendingSubmitButton>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
