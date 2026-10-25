export type QueryValue = string | number | boolean | undefined | null;

export function buildQueryString(query?: Record<string, QueryValue>) {
  if (!query) return "";

  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;

    params.set(key, String(value));
  }

  const serialized = params.toString();

  return serialized ? `?${serialized}` : "";
}

export function unwrapList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload;

  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;

    if (Array.isArray(record.data)) {
      const nested = record.data as unknown;

      if (
        nested &&
        typeof nested === "object" &&
        !Array.isArray(nested) &&
        Array.isArray((nested as Record<string, unknown>).data)
      ) {
        return (nested as Record<string, unknown>).data as T[];
      }

      return record.data as T[];
    }

    if (Array.isArray(record.items)) return record.items as T[];
    if (Array.isArray(record.results)) return record.results as T[];
  }

  return [];
}

export function unwrapData<T>(payload: unknown): T {
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;

    if ("data" in record) {
      const data = record.data as unknown;

      if (data && typeof data === "object" && "data" in (data as object)) {
        return (data as Record<string, unknown>).data as T;
      }

      return data as T;
    }
  }

  return payload as T;
}

export function unwrapMeta(payload: unknown): {
  limit: number;
  page: number;
  total: number;
  totalPages: number;
} {
  const fallback = { limit: 10, page: 1, total: 0, totalPages: 1 };

  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    const candidates: unknown[] = [record.meta];

    if (record.data && typeof record.data === "object") {
      const nested = record.data as Record<string, unknown>;
      candidates.push(nested.meta);
    }

    for (const candidate of candidates) {
      if (candidate && typeof candidate === "object") {
        const meta = candidate as Record<string, unknown>;
        const total = Number(meta.total ?? 0);
        const page = Number(meta.page ?? 1);
        const limit = Number(meta.limit ?? 10);
        const totalPages = Number(
          meta.totalPages ?? (limit > 0 ? Math.ceil(total / limit) : 1),
        );

        return {
          limit: Number.isFinite(limit) && limit > 0 ? limit : 10,
          page: Number.isFinite(page) && page > 0 ? page : 1,
          total: Number.isFinite(total) && total >= 0 ? total : 0,
          totalPages:
            Number.isFinite(totalPages) && totalPages > 0 ? totalPages : 1,
        };
      }
    }
  }

  return fallback;
}
