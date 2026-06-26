"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { MoreHorizontal, Pencil, Trash2, X } from "lucide-react";
import { deleteQuickAdminRecord, updateQuickAdminRecord } from "@/app/quick-admin-actions";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { splitSerieGenres } from "@/lib/serie-genres";

export type QuickAdminField = {
  name: string;
  label: string;
  type?: "text" | "textarea" | "number" | "date" | "select" | "multiselect" | "checkbox";
  value?: string | number | boolean | null;
  options?: Array<{ value: string; label: string }>;
};

type QuickAdminActionsProps = {
  resource: string;
  id: string;
  title: string;
  returnTo: string;
  deleteReturnTo?: string;
  fields: QuickAdminField[];
  align?: "start" | "end";
  variant?: "buttons" | "menu";
  extraActions?: ReactNode;
};

function fieldValue(value: QuickAdminField["value"]) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}

export function QuickAdminActions({
  resource,
  id,
  title,
  returnTo,
  deleteReturnTo,
  fields,
  align = "end",
  variant = "buttons",
  extraActions
}: QuickAdminActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  if (variant === "menu") {
    return (
      <div className={`relative inline-flex ${align === "end" ? "justify-end" : ""}`}>
        <button
          type="button"
          onClick={() => setIsMenuOpen((value) => !value)}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-ink hover:border-cinnabar hover:text-cinnabar"
          aria-expanded={isMenuOpen}
        >
          <MoreHorizontal size={16} aria-hidden="true" />
          Azioni
        </button>

        {isMenuOpen ? (
          <div className="absolute right-0 top-full z-30 mt-2 grid min-w-56 gap-1 rounded-md border border-stone-200 bg-white p-2 text-sm shadow-lg">
            <button
              type="button"
              onClick={() => {
                setIsMenuOpen(false);
                setIsOpen(true);
              }}
              className="inline-flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left font-semibold text-ink hover:bg-stone-50"
            >
              <Pencil size={15} aria-hidden="true" />
              Modifica
            </button>

            {extraActions}

            <form
              action={deleteQuickAdminRecord}
              onSubmit={(event) => {
                const confirmed = window.confirm(`Vuoi eliminare questo elemento?\n\n${title}`);

                if (!confirmed) {
                  event.preventDefault();
                }
              }}
            >
              <input type="hidden" name="resource" value={resource} />
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="return_to" value={deleteReturnTo ?? returnTo} />
              <PendingSubmitButton
                pendingText="Eliminazione..."
                className="inline-flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left font-semibold text-red-700 hover:bg-red-50 disabled:cursor-wait disabled:opacity-70"
              >
                <Trash2 size={15} aria-hidden="true" />
                Elimina
              </PendingSubmitButton>
            </form>
          </div>
        ) : null}

        {isOpen ? (
          <QuickEditDialog
            resource={resource}
            id={id}
            title={title}
            returnTo={returnTo}
            fields={fields}
            onClose={() => setIsOpen(false)}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap gap-2 ${align === "end" ? "justify-end" : ""}`}>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center justify-center gap-2 rounded-md border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-ink hover:border-cinnabar hover:text-cinnabar"
      >
        <Pencil size={15} aria-hidden="true" />
        Modifica
      </button>

      <form
        action={deleteQuickAdminRecord}
        onSubmit={(event) => {
          const confirmed = window.confirm(`Vuoi eliminare questo elemento?\n\n${title}`);

          if (!confirmed) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="resource" value={resource} />
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="return_to" value={deleteReturnTo ?? returnTo} />
        <PendingSubmitButton
          pendingText="Eliminazione..."
          className="inline-flex items-center justify-center gap-2 rounded-md border border-red-100 bg-white px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-wait disabled:opacity-70"
        >
          <Trash2 size={15} aria-hidden="true" />
          Elimina
        </PendingSubmitButton>
      </form>

      {isOpen ? (
        <QuickEditDialog
          resource={resource}
          id={id}
          title={title}
          returnTo={returnTo}
          fields={fields}
          onClose={() => setIsOpen(false)}
        />
      ) : null}
    </div>
  );
}

function QuickEditDialog({
  resource,
  id,
  title,
  returnTo,
  fields,
  onClose
}: {
  resource: string;
  id: string;
  title: string;
  returnTo: string;
  fields: QuickAdminField[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/45 px-4 py-6">
      <div
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-md border border-stone-200 bg-white p-5 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`quick-edit-${resource}-${id}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id={`quick-edit-${resource}-${id}`} className="text-lg font-semibold text-ink">
              Modifica
            </h2>
            <p className="mt-1 text-sm text-stone-600">{title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-stone-500 hover:bg-stone-100 hover:text-ink"
            aria-label="Chiudi"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <form action={updateQuickAdminRecord} className="mt-5 grid gap-4">
          <input type="hidden" name="resource" value={resource} />
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="return_to" value={returnTo} />

          {fields.map((field) => (
            <label key={field.name} className="grid gap-1 text-sm">
              <span className="font-medium text-ink">{field.label}</span>
              {field.type === "textarea" ? (
                <textarea
                  name={field.name}
                  defaultValue={fieldValue(field.value)}
                  rows={field.name === "trascrizione" ? 8 : 4}
                  className="rounded-md border border-stone-300 px-3 py-2 text-stone-900 outline-none focus:border-cinnabar"
                />
              ) : field.type === "select" ? (
                <select
                  name={field.name}
                  defaultValue={fieldValue(field.value)}
                  className="rounded-md border border-stone-300 px-3 py-2 text-stone-900 outline-none focus:border-cinnabar"
                >
                  {field.options?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : field.type === "multiselect" ? (
                <>
                  <input type="hidden" name={field.name} value="" />
                  <select
                    name={field.name}
                    defaultValue={splitSerieGenres(fieldValue(field.value))}
                    multiple
                    className="min-h-36 rounded-md border border-stone-300 px-3 py-2 text-stone-900 outline-none focus:border-cinnabar"
                  >
                    {field.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </>
              ) : field.type === "checkbox" ? (
                <input
                  type="hidden"
                  name={field.name}
                  value={field.value ? "false" : "true"}
                />
              ) : (
                <input
                  name={field.name}
                  type={field.type ?? "text"}
                  defaultValue={fieldValue(field.value)}
                  className="rounded-md border border-stone-300 px-3 py-2 text-stone-900 outline-none focus:border-cinnabar"
                />
              )}
              {field.type === "checkbox" ? (
                <span className="text-xs text-stone-500">
                  Valore attuale: {field.value ? "attivo" : "non attivo"}. Salvando verrà invertito.
                </span>
              ) : null}
            </label>
          ))}

          <div className="flex flex-wrap justify-end gap-3 border-t border-stone-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-stone-300 px-4 py-2 text-sm font-semibold text-ink hover:border-cinnabar hover:text-cinnabar"
            >
              Annulla
            </button>
            <PendingSubmitButton
              className="inline-flex items-center justify-center gap-2 rounded-md bg-cinnabar px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-wait disabled:bg-red-700/70"
            >
              Salva modifiche
            </PendingSubmitButton>
          </div>
        </form>
      </div>
    </div>
  );
}
