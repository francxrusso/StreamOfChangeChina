"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { Pencil, X } from "lucide-react";

const SerieBulkModeContext = createContext(false);

function useSerieBulkMode() {
  return useContext(SerieBulkModeContext);
}

export function SerieBulkMode({ children, showToggle = true }: { children: ReactNode; showToggle?: boolean }) {
  const [isBulkMode, setIsBulkMode] = useState(false);

  return (
    <SerieBulkModeContext.Provider value={isBulkMode}>
      <div className="grid gap-6">
        {showToggle ? (
        <div>
          <button
            type="button"
            onClick={() => setIsBulkMode((value) => !value)}
            className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold ${
              isBulkMode
                ? "border border-stone-300 bg-white text-ink hover:border-cinnabar hover:text-cinnabar"
                : "bg-ink text-white hover:bg-cinnabar"
            }`}
            aria-expanded={isBulkMode}
          >
            {isBulkMode ? <X size={16} aria-hidden="true" /> : <Pencil size={16} aria-hidden="true" />}
            {isBulkMode ? "Chiudi modifica in bulk" : "Modifica in bulk"}
          </button>
        </div>
        ) : null}
        {children}
      </div>
    </SerieBulkModeContext.Provider>
  );
}

export function SerieBulkContent({ children }: { children: ReactNode }) {
  const isBulkMode = useSerieBulkMode();

  return isBulkMode ? <>{children}</> : null;
}

export function SerieBulkCheckbox({ formId, value }: { formId: string; value: string }) {
  const isBulkMode = useSerieBulkMode();

  if (!isBulkMode) {
    return null;
  }

  return (
    <label className="absolute left-3 top-3 z-10 inline-flex items-center gap-2 rounded-md bg-white/95 px-3 py-2 text-xs font-semibold text-ink shadow-sm">
      <input form={formId} type="checkbox" name="selected_ids" value={value} className="h-4 w-4 rounded border-stone-300 text-cinnabar" />
      Bulk
    </label>
  );
}
