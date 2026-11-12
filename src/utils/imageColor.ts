import { imageCache } from "../services/image/imageCache";

export interface HslColor {
  h: number;
  s: number;
  l: number;
}

/** Formats an HSL colour as a CSS colour string with optional alpha. */
export const hsla = ({ h, s, l }: HslColor, alpha = 1): string =>
  `hsl(${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}% / ${alpha})`;

// The image is decoded straight to a small bitmap, so sampling is cheap.
const SAMPLE_SIZE = 48;

// Keep extracted colours readable as accents on both light and dark themes.
const MIN_LIGHTNESS = 35;
const MAX_LIGHTNESS = 60;
const MAX_SATURATION = 80;

const MAX_CONCURRENT_EXTRACTIONS = 4;

const rgbToHsl = (r: number, g: number, b: number): HslColor => {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const delta = max - min;

  if (delta === 0) {
    return { h: 0, s: 0, l: l * 100 };
  }

  const s = delta / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === rn) h = ((gn - bn) / delta) % 6;
  else if (max === gn) h = (bn - rn) / delta + 2;
  else h = (rn - gn) / delta + 4;

  return { h: (h * 60 + 360) % 360, s: s * 100, l: l * 100 };
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const sampleBitmap = (bitmap: ImageBitmap): Uint8ClampedArray | null => {
  if (typeof OffscreenCanvas !== "undefined") {
    const context = new OffscreenCanvas(SAMPLE_SIZE, SAMPLE_SIZE).getContext("2d");
    if (!context) return null;
    context.drawImage(bitmap, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
    return context.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data;
  }

  const canvas = document.createElement("canvas");
  canvas.width = SAMPLE_SIZE;
  canvas.height = SAMPLE_SIZE;
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.drawImage(bitmap, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
  return context.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data;
};

export const getDominantColorFromPixels = (data: Uint8ClampedArray): HslColor | null => {
  const buckets = new Map<number, { weight: number; r: number; g: number; b: number }>();

  for (let index = 0; index < data.length; index += 4) {
    if (data[index + 3] < 128) continue;
    const r = data[index];
    const g = data[index + 1];
    const b = data[index + 2];

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const saturation = max === 0 ? 0 : (max - min) / max;
    const lightness = (max + min) / 510;
    const weight = Math.floor(
      (1 + saturation * 6) * Math.max(0.05, 1 - Math.abs(lightness - 0.5) * 1.4) * 100,
    );
    if (weight <= 0) continue;

    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.weight += weight;
      bucket.r += r * weight;
      bucket.g += g * weight;
      bucket.b += b * weight;
    } else {
      buckets.set(key, { weight, r: r * weight, g: g * weight, b: b * weight });
    }
  }

  // Heaviest bucket wins; the key settles ties so a cover always gives the same colour.
  let bestKey = -1;
  let best: { weight: number; r: number; g: number; b: number } | undefined;
  for (const [key, bucket] of buckets) {
    if (!best || bucket.weight > best.weight || (bucket.weight === best.weight && key < bestKey)) {
      best = bucket;
      bestKey = key;
    }
  }
  if (!best) return null;

  const dominant = rgbToHsl(best.r / best.weight, best.g / best.weight, best.b / best.weight);
  if (dominant.s >= MUTED_SATURATION) return dominant;
  return getVividColorFromPixels(data) ?? dominant;
};

// A dominant colour below this saturation reads as grey, so a smaller vivid area is preferred.
const MUTED_SATURATION = 20;
const VIVID_MIN_SATURATION = 30;
const VIVID_MIN_LIGHTNESS = 15;
const VIVID_MAX_LIGHTNESS = 85;
const VIVID_HUE_BIN = 30;
// The vivid hue must cover at least this share of the image to count as part of the cover.
const VIVID_MIN_SHARE = 0.05;

/** Averages the most common vivid hue range, e.g. neon lights on an otherwise dark cover. */
const getVividColorFromPixels = (data: Uint8ClampedArray): HslColor | null => {
  const bins = new Map<number, { count: number; r: number; g: number; b: number }>();
  let total = 0;

  for (let index = 0; index < data.length; index += 4) {
    if (data[index + 3] < 128) continue;
    total += 1;
    const r = data[index];
    const g = data[index + 1];
    const b = data[index + 2];
    const { h, s, l } = rgbToHsl(r, g, b);
    if (s < VIVID_MIN_SATURATION || l < VIVID_MIN_LIGHTNESS || l > VIVID_MAX_LIGHTNESS) continue;

    const key = Math.floor(h / VIVID_HUE_BIN);
    const bin = bins.get(key);
    if (bin) {
      bin.count += 1;
      bin.r += r;
      bin.g += g;
      bin.b += b;
    } else {
      bins.set(key, { count: 1, r, g, b });
    }
  }

  let best: { count: number; r: number; g: number; b: number } | undefined;
  for (const [, bin] of [...bins].sort(([a], [b]) => a - b)) {
    if (!best || bin.count > best.count) best = bin;
  }
  if (!best || best.count < total * VIVID_MIN_SHARE) return null;

  return rgbToHsl(best.r / best.count, best.g / best.count, best.b / best.count);
};

export const getDominantColorFromBlob = async (blob: Blob): Promise<HslColor | null> => {
  if (typeof createImageBitmap !== "function") {
    return null;
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(blob, {
      resizeWidth: SAMPLE_SIZE,
      resizeHeight: SAMPLE_SIZE,
      resizeQuality: "low",
    });
  } catch {
    return null;
  }

  try {
    const data = sampleBitmap(bitmap);
    return data ? getDominantColorFromPixels(data) : null;
  } catch {
    return null;
  } finally {
    bitmap.close();
  }
};

export const toAccentColor = (color: HslColor): HslColor => ({
  h: color.h,
  s: Math.min(color.s, MAX_SATURATION),
  l: clamp(color.l, MIN_LIGHTNESS, MAX_LIGHTNESS),
});

const resolved = new Map<string, HslColor | null>();
const pending = new Map<string, Promise<HslColor | null>>();
const queue: (() => void)[] = [];
let active = 0;

const schedule = <T>(task: () => Promise<T>): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const run = () => {
      active += 1;
      task()
        .then(resolve, reject)
        .finally(() => {
          active -= 1;
          queue.shift()?.();
        });
    };
    if (active < MAX_CONCURRENT_EXTRACTIONS) run();
    else queue.push(run);
  });

export const peekImageAccentColor = (url: string): HslColor | null | undefined =>
  resolved.get(imageCache.getCacheKey(url));

export const getImageAccentColor = (url: string): Promise<HslColor | null> => {
  const key = imageCache.getCacheKey(url);

  if (resolved.has(key)) {
    return Promise.resolve(resolved.get(key) ?? null);
  }

  let promise = pending.get(key);
  if (!promise) {
    promise = schedule(async () => {
      const blob = await imageCache.getBlob(url);
      const dominant = blob ? await getDominantColorFromBlob(blob) : null;
      return dominant ? toAccentColor(dominant) : null;
    })
      .catch(() => null)
      .then((color) => {
        resolved.set(key, color);
        pending.delete(key);
        return color;
      });
    pending.set(key, promise);
  }
  return promise;
};

export const MIN_THEME_SATURATION = 12;

export const accentThemeVars = ({ h, s }: HslColor): Record<string, string> | undefined => {
  if (s < MIN_THEME_SATURATION) return undefined;
  const hue = (l: number) => `hsl(${Math.round(h)} ${Math.round(s)}% ${l}%)`;
  const step = (light: number, dark: number) => `light-dark(${hue(light)}, ${hue(dark)})`;
  const tonal = (amount: number, surface: string) =>
    `color-mix(in oklab, var(--color-primary0) ${amount}%, var(${surface}))`;

  return {
    "--color-primary0": step(40, 55),
    "--color-primary1": step(34, 62),
    "--color-primary2": step(28, 68),
    "--color-primary3": step(24, 74),
    "--color-primary4": step(20, 80),
    "--color-primary5": step(16, 86),
    "--color-surface-tonal0": tonal(10, "--color-surface0"),
    "--color-surface-tonal1": tonal(14, "--color-surface0"),
    "--color-surface-tonal2": tonal(20, "--color-surface1"),
    "--color-surface-tonal3": tonal(28, "--color-surface1"),
    "--color-surface-tonal4": tonal(38, "--color-surface2"),
    "--color-surface-tonal5": tonal(48, "--color-surface2"),
  };
};

export const hslToHex = ({ h, s, l }: HslColor): string => {
  const sn = s / 100;
  const ln = l / 100;
  const a = sn * Math.min(ln, 1 - ln);
  const channel = (n: number) => {
    const k = (n + h / 30) % 12;
    const value = ln - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(value * 255).toString(16).padStart(2, "0");
  };
  return `#${channel(0)}${channel(8)}${channel(4)}`;
};
