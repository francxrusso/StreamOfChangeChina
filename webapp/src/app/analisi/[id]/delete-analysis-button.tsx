"use client";

import { Trash2 } from "lucide-react";
import { deleteAnalysisRun } from "../actions";

type DeleteAnalysisButtonProps = {
  id: string;
  title: string;
};

export function DeleteAnalysisButton({ id, title }: DeleteAnalysisButtonProps) {
  return (
    <form
      action={deleteAnalysisRun}
      onSubmit={(event) => {
        const confirmed = window.confirm(`Vuoi eliminare questa analisi?\n\n${title}`);

        if (!confirmed) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="inline-flex items-center justify-center gap-2 rounded-md border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
      >
        <Trash2 size={16} aria-hidden="true" />
        Elimina
      </button>
    </form>
  );
}
