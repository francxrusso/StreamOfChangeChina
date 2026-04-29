"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Search } from "lucide-react";

type TranscriptViewerProps = {
  text: string;
};

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) {
    return <>{text}</>;
  }

  const regex = new RegExp(`(${escapeRegex(query.trim())})`, "gi");
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === query.trim().toLowerCase() ? (
          <mark key={`${part}-${index}`} className="bg-amber-200 px-1 text-ink">
            {part}
          </mark>
        ) : (
          <span key={`${part}-${index}`}>{part}</span>
        )
      )}
    </>
  );
}

export function TranscriptViewer({ text }: TranscriptViewerProps) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(true);

  const paragraphs = useMemo(
    () =>
      text
        .split(/\n{2,}/)
        .map((part) => part.trim())
        .filter(Boolean),
    [text]
  );

  const matches = useMemo(() => {
    const cleanQuery = query.trim();
    if (!cleanQuery) return 0;

    const regex = new RegExp(escapeRegex(cleanQuery), "gi");
    return paragraphs.reduce((count, paragraph) => count + (paragraph.match(regex)?.length ?? 0), 0);
  }, [paragraphs, query]);

  const visibleParagraphs = query.trim()
    ? paragraphs.filter((paragraph) => paragraph.toLowerCase().includes(query.trim().toLowerCase()))
    : paragraphs;

  return (
    <div>
      <div className="flex flex-col gap-3 border-t border-stone-100 pt-5 md:flex-row md:items-center md:justify-between">
        <label className="relative block md:w-96">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cerca nella trascrizione"
            className="w-full rounded-md border border-stone-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-cinnabar"
          />
        </label>

        <div className="flex items-center gap-3">
          <span className="text-sm text-stone-600">
            {query.trim() ? `${matches} occorrenze` : `${paragraphs.length} blocchi`}
          </span>
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="inline-flex items-center gap-2 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-ink hover:border-cinnabar"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {expanded ? "Nascondi" : "Mostra"}
          </button>
        </div>
      </div>

      {expanded ? (
        <div className="mt-5 max-h-[70vh] overflow-auto pr-2">
          {visibleParagraphs.length > 0 ? (
            <div className="grid gap-4">
              {visibleParagraphs.map((paragraph, index) => (
                <p key={`${index}-${paragraph.slice(0, 12)}`} className="leading-8 text-stone-800">
                  <HighlightedText text={paragraph} query={query} />
                </p>
              ))}
            </div>
          ) : (
            <p className="text-sm text-stone-600">Nessun risultato nella trascrizione.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
