"use client";

import { Trash2 } from "lucide-react";
import { deleteLessicoRecord } from "./actions";

type DeleteLessicoButtonProps = {
  id: string;
  label: string;
  returnTo: string;
};

export function DeleteLessicoButton({ id, label, returnTo }: DeleteLessicoButtonProps) {
  return (
    <form
      action={deleteLessicoRecord}
      onSubmit={(event) => {
        const confirmed = window.confirm(`Vuoi eliminare questo elemento dal lessico?\n\n${label}`);

        if (!confirmed) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="return_to" value={returnTo} />
      <button
        type="submit"
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-red-100 text-red-600 hover:bg-red-50"
        aria-label="Elimina elemento lessicale"
        title="Elimina elemento lessicale"
      >
        <Trash2 size={16} aria-hidden="true" />
      </button>
    </form>
  );
}
