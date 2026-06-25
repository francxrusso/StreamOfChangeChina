import Link from "next/link";

type PaginationParams = Record<string, string | number | null | undefined>;

type PaginationProps = {
  basePath: string;
  page: number;
  perPage: number;
  total: number;
  params?: PaginationParams;
  itemLabel?: string;
};

function buildHref(basePath: string, params: PaginationParams, page: number) {
  const nextParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      nextParams.set(key, String(value));
    }
  }

  if (page > 1) {
    nextParams.set("page", String(page));
  }

  const queryString = nextParams.toString();

  return queryString ? `${basePath}?${queryString}` : basePath;
}

function getPageWindow(page: number, totalPages: number) {
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  const pages: number[] = [];

  for (let item = start; item <= end; item += 1) {
    pages.push(item);
  }

  return pages;
}

export function Pagination({ basePath, page, perPage, total, params = {}, itemLabel = "risultati" }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const from = total === 0 ? 0 : (currentPage - 1) * perPage + 1;
  const to = Math.min(currentPage * perPage, total);
  const pages = getPageWindow(currentPage, totalPages);

  return (
    <nav className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-stone-200 bg-white px-4 py-3 text-sm" aria-label="Paginazione">
      <p className="text-stone-600">
        {total === 0 ? `0 ${itemLabel}` : `${from}-${to} di ${total} ${itemLabel}`}
      </p>

      {totalPages > 1 ? (
        <div className="flex flex-wrap items-center gap-2">
          {currentPage > 1 ? (
            <Link
              href={buildHref(basePath, params, currentPage - 1)}
              className="rounded-md border border-stone-200 px-3 py-2 font-semibold text-stone-700 hover:border-cinnabar hover:text-cinnabar"
            >
              Precedente
            </Link>
          ) : (
            <span className="rounded-md border border-stone-100 px-3 py-2 font-semibold text-stone-300">Precedente</span>
          )}

          {pages[0] > 1 ? (
            <>
              <Link
                href={buildHref(basePath, params, 1)}
                className="rounded-md border border-stone-200 px-3 py-2 font-semibold text-stone-700 hover:border-cinnabar hover:text-cinnabar"
              >
                1
              </Link>
              {pages[0] > 2 ? <span className="px-1 text-stone-400">...</span> : null}
            </>
          ) : null}

          {pages.map((item) =>
            item === currentPage ? (
              <span key={item} className="rounded-md border border-cinnabar bg-cinnabar px-3 py-2 font-semibold text-white">
                {item}
              </span>
            ) : (
              <Link
                key={item}
                href={buildHref(basePath, params, item)}
                className="rounded-md border border-stone-200 px-3 py-2 font-semibold text-stone-700 hover:border-cinnabar hover:text-cinnabar"
              >
                {item}
              </Link>
            )
          )}

          {pages[pages.length - 1] < totalPages ? (
            <>
              {pages[pages.length - 1] < totalPages - 1 ? <span className="px-1 text-stone-400">...</span> : null}
              <Link
                href={buildHref(basePath, params, totalPages)}
                className="rounded-md border border-stone-200 px-3 py-2 font-semibold text-stone-700 hover:border-cinnabar hover:text-cinnabar"
              >
                {totalPages}
              </Link>
            </>
          ) : null}

          {currentPage < totalPages ? (
            <Link
              href={buildHref(basePath, params, currentPage + 1)}
              className="rounded-md border border-stone-200 px-3 py-2 font-semibold text-stone-700 hover:border-cinnabar hover:text-cinnabar"
            >
              Successiva
            </Link>
          ) : (
            <span className="rounded-md border border-stone-100 px-3 py-2 font-semibold text-stone-300">Successiva</span>
          )}
        </div>
      ) : null}
    </nav>
  );
}
