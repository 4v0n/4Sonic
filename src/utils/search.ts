import { buildSearchBlob, normalizeText, tokenize } from "./strings";

export type SearchCandidate = {
  id: string;
  blob: string;
};

export const createSearchCandidate = (id: string, parts: Array<string | null | undefined>): SearchCandidate => {
  return { id, blob: buildSearchBlob(parts) };
};

export const matchesQuery = (blob: string, query: string): boolean => {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return true;
  return blob.includes(normalizedQuery);
};

export const scoreQuery = (blob: string, query: string): number => {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return 0;

  if (blob === normalizedQuery) return 100;
  if (blob.startsWith(normalizedQuery)) return 80;
  if (blob.includes(normalizedQuery)) return 60;

  const queryTokens = tokenize(normalizedQuery);
  if (queryTokens.length === 0) return 0;

  let hits = 0;
  queryTokens.forEach((token) => {
    if (blob.includes(token)) {
      hits += 1;
    }
  });

  return Math.round((hits / queryTokens.length) * 50);
};

export const filterAndRank = <T extends SearchCandidate>(
  items: T[],
  query: string,
  options?: { limit?: number; minScore?: number },
): T[] => {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return items;

  const minScore = options?.minScore ?? 1;
  const ranked = items
    .map((item) => ({ item, score: scoreQuery(item.blob, normalizedQuery) }))
    .filter((entry) => entry.score >= minScore)
    .sort((left, right) => right.score - left.score)
    .map((entry) => entry.item);

  if (typeof options?.limit === "number") {
    return ranked.slice(0, options.limit);
  }
  return ranked;
};
