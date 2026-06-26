"use client";

import { Trash2 } from "lucide-react";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { deleteDanmuRecord } from "./actions";

type DeleteDanmuButtonProps = {
  id: string;
  label: string;
  returnTo: string;
};

export function DeleteDanmuButton({ id, label, returnTo }: DeleteDanmuButtonProps) {
  return (
    <form
      action={deleteDanmuRecord}
      onSubmit={(event) => {
        const confirmed = window.confirm(`Vuoi eliminare questo Danmu?\n\n${label}`);

        if (!confirmed) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="return_to" value={returnTo} />
      <PendingSubmitButton
        pendingText=""
        className="inline-flex h-9 w-9 items-center justify-center gap-0 rounded-md border border-red-100 text-red-600 hover:bg-red-50 disabled:cursor-wait disabled:opacity-70"
        aria-label="Elimina Danmu"
        title="Elimina Danmu"
      >
        <Trash2 size={16} aria-hidden="true" />
      </PendingSubmitButton>
    </form>
  );
}
