export const clamp = (value: number, min: number, max: number): number => {
  const lower = Math.min(min, max);
  const upper = Math.max(min, max);
  return Math.min(Math.max(value, lower), upper);
};

export const clamp01 = (value: number): number => clamp(value, 0, 1);

export const safeNumber = (value: unknown, fallback = 0): number => {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
};
