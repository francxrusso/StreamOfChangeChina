"use client";

import { useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { saveDanmuScreenshot } from "./actions";

type DanmuScreenshotModalProps = {
  id: string;
  title: string;
  returnTo: string;
  currentUrl?: string | null;
};

export function DanmuScreenshotModal({ id, title, returnTo, currentUrl }: DanmuScreenshotModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center justify-center gap-2 rounded-md border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-ink hover:border-cinnabar hover:text-cinnabar"
      >
        <ImagePlus size={15} aria-hidden="true" />
        Screen
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/45 px-4 py-6">
          <div
            className="w-full max-w-lg rounded-md border border-stone-200 bg-white p-5 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`danmu-screen-${id}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id={`danmu-screen-${id}`} className="text-lg font-semibold text-ink">
                  Screenshot del minuto
                </h2>
                <p className="mt-1 text-sm leading-6 text-stone-600">{title}</p>
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

            <form action={saveDanmuScreenshot} className="mt-5 grid gap-4">
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="return_to" value={returnTo} />

              <label className="grid gap-1 text-sm">
                <span className="font-medium text-ink">Link immagine</span>
                <input
                  name="screenshot_url"
                  type="url"
                  defaultValue={currentUrl ?? ""}
                  placeholder="https://..."
                  className="rounded-md border border-stone-300 px-3 py-2 text-stone-900 outline-none focus:border-cinnabar"
                />
              </label>

              <label className="grid gap-1 text-sm">
                <span className="font-medium text-ink">Oppure carica immagine</span>
                <input
                  type="file"
                  name="screenshot_file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-900 file:mr-3 file:rounded-sm file:border-0 file:bg-stone-100 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-ink hover:file:bg-stone-200"
                />
                <span className="text-xs text-stone-500">Se carichi un file, verra usato quello. Limite 8MB.</span>
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
                  pendingText="Salvataggio..."
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-cinnabar px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-wait disabled:bg-red-700/70"
                >
                  Salva screenshot
                </PendingSubmitButton>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
