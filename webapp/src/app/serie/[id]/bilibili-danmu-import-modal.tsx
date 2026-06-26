"use client";

import { useState } from "react";
import { MessageSquarePlus, Upload, X } from "lucide-react";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { importBilibiliDanmuXml } from "./danmu-import-actions";

type BilibiliDanmuImportModalProps = {
  serieId: string;
  episodeId: string;
  episodeTitle: string;
  returnTo: string;
};

export function BilibiliDanmuImportModal({
  serieId,
  episodeId,
  episodeTitle,
  returnTo
}: BilibiliDanmuImportModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-ink hover:border-cinnabar hover:text-cinnabar"
      >
        <MessageSquarePlus size={15} aria-hidden="true" />
        Aggiungi danmu da Bilibili
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/45 px-4 py-6">
          <div
            className="w-full max-w-lg rounded-md border border-stone-200 bg-white p-5 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`bilibili-danmu-${episodeId}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id={`bilibili-danmu-${episodeId}`} className="text-lg font-semibold text-ink">
                  Aggiungi danmu da Bilibili
                </h2>
                <p className="mt-1 text-sm leading-6 text-stone-600">
                  {episodeTitle}. Carica un XML Bilibili: verranno salvati solo timestamp e commento, saltando i commenti duplicati.
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

            <form action={importBilibiliDanmuXml} className="mt-5 grid gap-4">
              <input type="hidden" name="serie_id" value={serieId} />
              <input type="hidden" name="episodio_id" value={episodeId} />
              <input type="hidden" name="return_to" value={returnTo} />

              <label className="grid gap-2 text-sm">
                <span className="font-medium text-ink">File XML</span>
                <input
                  type="file"
                  name="danmu_xml"
                  accept=".xml,text/xml,application/xml"
                  required
                  className="rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-900 file:mr-3 file:rounded-sm file:border-0 file:bg-stone-100 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-ink hover:file:bg-stone-200"
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
                  pendingText="Caricamento..."
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-cinnabar px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-wait disabled:bg-red-700/70"
                >
                  <Upload size={16} aria-hidden="true" />
                  Carica danmu
                </PendingSubmitButton>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
