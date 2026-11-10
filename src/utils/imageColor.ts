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

  return rgbToHsl(best.r / best.weight, best.g / best.weight, best.b / best.weight);
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
