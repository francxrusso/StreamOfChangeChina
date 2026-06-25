export type PaginationState = {
  page: number;
  perPage: number;
  from: number;
  to: number;
};

export function parsePage(value: string | string[] | undefined) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const page = Number.parseInt(rawValue ?? "", 10);

  return Number.isFinite(page) && page > 0 ? page : 1;
}

export function getPagination(page: number, perPage: number): PaginationState {
  const normalizedPage = Number.isFinite(page) && page > 0 ? page : 1;
  const normalizedPerPage = Number.isFinite(perPage) && perPage > 0 ? perPage : 24;
  const from = (normalizedPage - 1) * normalizedPerPage;

  return {
    page: normalizedPage,
    perPage: normalizedPerPage,
    from,
    to: from + normalizedPerPage - 1
  };
}

export function paginateItems<T>(items: T[], page: number, perPage: number) {
  const pagination = getPagination(page, perPage);

  return {
    items: items.slice(pagination.from, pagination.from + pagination.perPage),
    total: items.length,
    pagination
  };
}
