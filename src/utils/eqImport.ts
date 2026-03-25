import type { EqFilterType } from "../store/eqStore";

export type ParsedEqImportFilter = {
  type: EqFilterType;
  freq: number;
  gain: number;
  q: number;
  enabled: boolean;
};

export type ParsedEqImportResult = {
  preamp: number | null;
  filters: ParsedEqImportFilter[];
};

const PREAMP_PATTERN = /^Preamp:\s*([+-]?\d*\.?\d+)\s*dB\s*$/i;
const FILTER_PATTERN = /^Filter\s+(\d+):\s*(?:(ON|OFF)\s+)?([A-Z0-9_]+)\s+Fc\s+([+-]?\d*\.?\d+)\s*Hz\s+Gain\s+([+-]?\d*\.?\d+)\s*dB\s+Q\s+([+-]?\d*\.?\d+)\s*$/i;

const parseNumber = (value: string): number | null => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseFilterType = (raw: string): EqFilterType => {
  const token = raw.trim().toUpperCase();
  if (token === "LS" || token === "LSC" || token === "LOWSHELF" || token === "LOW_SHELF") {
    return "lowshelf";
  }
  if (token === "HS" || token === "HSC" || token === "HIGHSHELF" || token === "HIGH_SHELF") {
    return "highshelf";
  }
  return "peaking";
};

export const parseSquiglinkEqText = (input: string): ParsedEqImportResult => {
  const rows = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  let preamp: number | null = null;
  const filters: Array<ParsedEqImportFilter & { order: number }> = [];

  rows.forEach((row) => {
    const preampMatch = row.match(PREAMP_PATTERN);
    if (preampMatch) {
      const value = parseNumber(preampMatch[1]);
      if (value !== null) {
        preamp = value;
      }
      return;
    }

    const filterMatch = row.match(FILTER_PATTERN);
    if (!filterMatch) {
      return;
    }

    const order = Number.parseInt(filterMatch[1], 10);
    const enabled = (filterMatch[2] ?? "ON").toUpperCase() !== "OFF";
    const type = parseFilterType(filterMatch[3]);
    const freq = parseNumber(filterMatch[4]);
    const gain = parseNumber(filterMatch[5]);
    const q = parseNumber(filterMatch[6]);

    if (freq === null || gain === null || q === null) {
      return;
    }

    filters.push({
      order: Number.isFinite(order) ? order : filters.length + 1,
      enabled,
      type,
      freq,
      gain,
      q,
    });
  });

  if (filters.length === 0) {
    throw new Error("No filters were detected. Paste Squiglink/AutoEQ text with lines like: Filter 1: ON PK Fc ...");
  }

  filters.sort((a, b) => a.order - b.order);

  return {
    preamp,
    filters: filters.map((filter) => ({
      enabled: filter.enabled,
      type: filter.type,
      freq: filter.freq,
      gain: filter.gain,
      q: filter.q,
    })),
  };
};
