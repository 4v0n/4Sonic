const COLLAPSE_WHITESPACE = /\s+/g;
const NON_ALPHANUMERIC = /[^a-z0-9]+/g;
const DIACRITICS = /[\u0300-\u036f]/g;

export const normalizeText = (value: string): string => {
  if (!value) return "";
  return value
    .normalize("NFKD")
    .replace(DIACRITICS, "")
    .toLowerCase()
    .trim()
    .replace(COLLAPSE_WHITESPACE, " ");
};

export const tokenize = (value: string): string[] => {
  const normalized = normalizeText(value);
  if (!normalized) return [];
  return normalized.split(NON_ALPHANUMERIC).filter(Boolean);
};

export const buildSearchBlob = (parts: Array<string | null | undefined>): string => {
  return normalizeText(parts.filter(Boolean).join(" "));
};

export const includesNormalized = (haystack: string, needle: string): boolean => {
  const normalizedNeedle = normalizeText(needle);
  if (!normalizedNeedle) return true;
  return normalizeText(haystack).includes(normalizedNeedle);
};
