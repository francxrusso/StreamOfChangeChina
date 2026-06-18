"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Search, UserRound } from "lucide-react";

type TranscriptViewerProps = {
  text: string;
  segments?: TranscriptSegment[];
};

type TranscriptSegment = {
  speaker: string;
  text: string;
};

const speakerLineRegex = /^\s*([^：:\n]{1,24})[：:]\s*(.+)$/u;

function isPlausibleSpeakerLabel(value: string) {
  const label = value.trim();

  if (!label || /[\d()[\]（）《》<>]/u.test(label)) {
    return false;
  }

  return /^[\p{Script=Han}A-Za-zÀ-ÿ·.\s-]{1,24}$/u.test(label);
}

function parseSpeakerSegments(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const segments: TranscriptSegment[] = [];

  for (const line of lines) {
    const match = line.match(speakerLineRegex);

    if (match && isPlausibleSpeakerLabel(match[1])) {
      segments.push({
        speaker: match[1].trim(),
        text: match[2].trim()
      });
      continue;
    }

    const lastSegment = segments.at(-1);
    if (lastSegment) {
      lastSegment.text = `${lastSegment.text} ${line}`.trim();
    }
  }

  return segments.length >= 3 ? segments : [];
}

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

export function TranscriptViewer({ text, segments }: TranscriptViewerProps) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(true);
  const [speakerFilter, setSpeakerFilter] = useState("all");

  const paragraphs = useMemo(
    () =>
      text
        .split(/\n{2,}/)
        .map((part) => part.trim())
        .filter(Boolean),
    [text]
  );
  const speakerSegments = useMemo(() => (segments?.length ? segments : parseSpeakerSegments(text)), [segments, text]);
  const hasSpeakerSegments = speakerSegments.length > 0;
  const speakers = useMemo(
    () => Array.from(new Set(speakerSegments.map((segment) => segment.speaker))).sort((a, b) => a.localeCompare(b, "zh")),
    [speakerSegments]
  );
  const searchableBlocks = hasSpeakerSegments
    ? speakerSegments.map((segment) => `${segment.speaker}: ${segment.text}`)
    : paragraphs;

  const matches = useMemo(() => {
    const cleanQuery = query.trim();
    if (!cleanQuery) return 0;

    const regex = new RegExp(escapeRegex(cleanQuery), "gi");
    return searchableBlocks.reduce((count, block) => count + (block.match(regex)?.length ?? 0), 0);
  }, [searchableBlocks, query]);

  const visibleParagraphs = query.trim()
    ? paragraphs.filter((paragraph) => paragraph.toLowerCase().includes(query.trim().toLowerCase()))
    : paragraphs;
  const visibleSegments = speakerSegments.filter((segment) => {
    const matchesSpeaker = speakerFilter === "all" || segment.speaker === speakerFilter;
    const matchesQuery =
      !query.trim() ||
      `${segment.speaker}: ${segment.text}`.toLowerCase().includes(query.trim().toLowerCase());

    return matchesSpeaker && matchesQuery;
  });

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
            {query.trim()
              ? `${matches} occorrenze`
              : hasSpeakerSegments
                ? `${speakerSegments.length} battute`
                : `${paragraphs.length} blocchi`}
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

      {hasSpeakerSegments ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSpeakerFilter("all")}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium ${
              speakerFilter === "all"
                ? "border-cinnabar bg-red-50 text-cinnabar"
                : "border-stone-200 bg-white text-stone-700 hover:border-cinnabar"
            }`}
          >
            Tutti
          </button>
          {speakers.map((speaker) => (
            <button
              key={speaker}
              type="button"
              onClick={() => setSpeakerFilter(speaker)}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium ${
                speakerFilter === speaker
                  ? "border-cinnabar bg-red-50 text-cinnabar"
                  : "border-stone-200 bg-white text-stone-700 hover:border-cinnabar"
              }`}
            >
              <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
              {speaker}
            </button>
          ))}
        </div>
      ) : null}

      {expanded ? (
        <div className="mt-5 max-h-[70vh] overflow-auto pr-2">
          {hasSpeakerSegments ? (
            visibleSegments.length > 0 ? (
              <div className="grid gap-3">
                {visibleSegments.map((segment, index) => (
                  <article
                    key={`${index}-${segment.speaker}-${segment.text.slice(0, 12)}`}
                    className="grid gap-2 rounded-md border border-stone-100 bg-stone-50/70 p-4 md:grid-cols-[10rem_1fr]"
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                      <UserRound className="h-4 w-4 text-cinnabar" aria-hidden="true" />
                      {segment.speaker}
                    </div>
                    <p className="leading-8 text-stone-800">
                      <HighlightedText text={segment.text} query={query} />
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="text-sm text-stone-600">Nessun risultato nella trascrizione.</p>
            )
          ) : visibleParagraphs.length > 0 ? (
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
