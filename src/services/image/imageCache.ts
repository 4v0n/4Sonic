import { CachedImageRow, imageCacheDb } from "../../db/imageCacheDb";

const MAX_CACHE_BYTES = 250 * 1024 * 1024;
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const WEBP_QUALITY = 0.84;
const MAX_OBJECT_URLS = 600;
const MAX_CACHE_KEYS = 5000;
const LAST_ACCESSED_GRANULARITY_MS = 60 * 60 * 1000;

const VOLATILE_QUERY_PARAMS = new Set(["u", "t", "s", "v", "c"]);
const WEBP_SOURCE_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/bmp"]);

interface ObjectUrlEntry {
  url: string;
  refCount: number;
  pinned?: HTMLImageElement;
}

const createObjectUrlEntry = (blob: Blob, refCount: number): ObjectUrlEntry => {
  const url = URL.createObjectURL(blob);
  if (typeof Image === "undefined") {
    return { url, refCount };
  }
  const pinned = new Image();
  pinned.decoding = "async";
  pinned.src = url;
  return { url, refCount, pinned };
};

export interface CachedImageSource {
  url: string;
  fromCache: boolean;
  cleanup?: () => void;
  cachePromise?: Promise<void>;
}

const isIndexedDbAvailable = (): boolean => typeof indexedDB !== "undefined";

const parseUrl = (value: string): URL | null => {
  try {
    if (typeof window !== "undefined") {
      return new URL(value, window.location.origin);
    }
    return new URL(value);
  } catch {
    try {
      return new URL(value, "http://localhost");
    } catch {
      return null;
    }
  }
};

const sortSearchParams = (params: URLSearchParams): [string, string][] =>
  Array.from(params.entries()).sort(([leftKey, leftValue], [rightKey, rightValue]) => {
    if (leftKey === rightKey) {
      return leftValue.localeCompare(rightValue);
    }
    return leftKey.localeCompare(rightKey);
  });

const isSubsonicCoverArtRequest = (url: URL): boolean => url.pathname.includes("getCoverArt.view");

class ImageCache {
  private objectUrls = new Map<string, ObjectUrlEntry>();
  private cacheKeys = new Map<string, string>();
  private prefetchPromises = new Map<string, Promise<void>>();

  public peekObjectUrl(sourceUrl: string): string | undefined {
    if (!sourceUrl) {
      return undefined;
    }
    return this.objectUrls.get(this.createCacheKey(sourceUrl))?.url;
  }

  public async getImageSource(sourceUrl: string, options?: { allowPrefetch?: boolean }): Promise<CachedImageSource> {
    if (!sourceUrl || !isIndexedDbAvailable()) {
      return { url: sourceUrl, fromCache: false };
    }

    const key = this.createCacheKey(sourceUrl);
    const inMemory = this.objectUrls.get(key);
    if (inMemory) {
      inMemory.refCount += 1;
      this.touchObjectUrl(key, inMemory);
      return {
        url: inMemory.url,
        fromCache: true,
        cleanup: () => this.release(key),
      };
    }

    const cached = await this.readCached(key);

    if (cached) {
      const url = this.acquireObjectUrl(key, cached.blob);
      return {
        url,
        fromCache: true,
        cleanup: () => this.release(key),
      };
    }

    if (options?.allowPrefetch === false) {
      return { url: sourceUrl, fromCache: false };
    }

    const cachePromise = this.prefetch(key, sourceUrl);
    return { url: sourceUrl, fromCache: false, cachePromise };
  }

  public getCacheKey(sourceUrl: string): string {
    return this.createCacheKey(sourceUrl);
  }

  public async getBlob(sourceUrl: string): Promise<Blob | null> {
    if (!sourceUrl) {
      return null;
    }

    if (isIndexedDbAvailable()) {
      const key = this.createCacheKey(sourceUrl);
      const cached = await this.readCached(key);
      if (cached) {
        return cached.blob;
      }
      await this.prefetch(key, sourceUrl);
      const stored = await imageCacheDb.images.get(key);
      if (stored) {
        return stored.blob;
      }
    }

    try {
      const response = await fetch(sourceUrl);
      return response.ok ? await response.blob() : null;
    } catch {
      return null;
    }
  }

  public async invalidate(sourceUrl: string): Promise<void> {
    if (!sourceUrl || !isIndexedDbAvailable()) {
      return;
    }
    const key = this.createCacheKey(sourceUrl);
    await imageCacheDb.images.delete(key);
    this.revokeObjectUrl(key);
  }

  private createCacheKey(sourceUrl: string): string {
    const known = this.cacheKeys.get(sourceUrl);
    if (known !== undefined) {
      return known;
    }
    const key = this.computeCacheKey(sourceUrl);
    if (this.cacheKeys.size >= MAX_CACHE_KEYS) {
      this.cacheKeys.clear();
    }
    this.cacheKeys.set(sourceUrl, key);
    return key;
  }

  private computeCacheKey(sourceUrl: string): string {
    const parsed = parseUrl(sourceUrl);
    if (!parsed) {
      return sourceUrl;
    }

    parsed.hash = "";
    if (isSubsonicCoverArtRequest(parsed)) {
      for (const parameter of VOLATILE_QUERY_PARAMS) {
        parsed.searchParams.delete(parameter);
      }
    }

    const sorted = sortSearchParams(parsed.searchParams);
    parsed.search = "";
    for (const [key, value] of sorted) {
      parsed.searchParams.append(key, value);
    }

    return parsed.toString();
  }

  private async readCached(id: string): Promise<CachedImageRow | null> {
    const row = await imageCacheDb.images.get(id);
    if (row) {
      const now = Date.now();
      if (now - (row.lastAccessed ?? 0) > LAST_ACCESSED_GRANULARITY_MS) {
        void imageCacheDb.images.update(id, { lastAccessed: now });
      }
      return row;
    }
    return null;
  }

  private acquireObjectUrl(id: string, blob: Blob): string {
    const existing = this.objectUrls.get(id);
    if (existing) {
      existing.refCount += 1;
      this.touchObjectUrl(id, existing);
      return existing.url;
    }

    const entry = createObjectUrlEntry(blob, 1);
    this.touchObjectUrl(id, entry);
    this.evictIdleObjectUrls();
    return entry.url;
  }

  private touchObjectUrl(id: string, entry: ObjectUrlEntry): void {
    this.objectUrls.delete(id);
    this.objectUrls.set(id, entry);
  }

  private release(id: string): void {
    const entry = this.objectUrls.get(id);
    if (!entry) {
      return;
    }

    entry.refCount = Math.max(0, entry.refCount - 1);
    this.evictIdleObjectUrls();
  }

  private evictIdleObjectUrls(): void {
    if (this.objectUrls.size <= MAX_OBJECT_URLS) {
      return;
    }
    for (const [id, entry] of this.objectUrls) {
      if (this.objectUrls.size <= MAX_OBJECT_URLS) {
        break;
      }
      if (entry.refCount > 0) {
        continue;
      }
      URL.revokeObjectURL(entry.url);
      this.objectUrls.delete(id);
    }
  }

  private revokeObjectUrl(id: string): void {
    const entry = this.objectUrls.get(id);
    if (!entry) {
      return;
    }
    URL.revokeObjectURL(entry.url);
    this.objectUrls.delete(id);
  }

  private prefetch(id: string, sourceUrl: string): Promise<void> {
    const ongoing = this.prefetchPromises.get(id);
    if (ongoing) {
      return ongoing;
    }

    const task = this.prefetchInternal(id, sourceUrl)
      .catch((error) => {
        if (!(error instanceof DOMException) || error.name !== "AbortError") {
          console.warn("Image cache prefetch failed", error);
        }
      })
      .finally(() => {
        this.prefetchPromises.delete(id);
      });

    this.prefetchPromises.set(id, task);
    return task;
  }

  private async prefetchInternal(id: string, sourceUrl: string): Promise<void> {
    const response = await fetch(sourceUrl, { cache: "no-store" });
    if (!response.ok) {
      return;
    }

    const contentLength = Number(response.headers.get("content-length") ?? 0);
    if (contentLength && contentLength > MAX_IMAGE_BYTES) {
      if (response.body) {
        await response.body.cancel();
      }
      return;
    }

    const originalBlob = await response.blob();
    if (originalBlob.size === 0 || originalBlob.size > MAX_IMAGE_BYTES) {
      return;
    }

    const normalizedBlob = await this.normalizeBlobForStorage(originalBlob);
    if (normalizedBlob.size === 0 || normalizedBlob.size > MAX_IMAGE_BYTES) {
      return;
    }

    const now = Date.now();
    const row: CachedImageRow = {
      id,
      sourceUrl,
      blob: normalizedBlob,
      mimeType: normalizedBlob.type || undefined,
      size: normalizedBlob.size,
      createdAt: now,
      lastAccessed: now,
    };

    await imageCacheDb.transaction("rw", imageCacheDb.images, async () => {
      await imageCacheDb.images.put(row);
      await this.evictIfNeeded();
    });

    if (!this.objectUrls.has(id)) {
      this.touchObjectUrl(id, createObjectUrlEntry(normalizedBlob, 0));
      this.evictIdleObjectUrls();
    }
  }

  private async normalizeBlobForStorage(blob: Blob): Promise<Blob> {
    const mimeType = blob.type.toLowerCase();
    if (!WEBP_SOURCE_TYPES.has(mimeType)) {
      return blob;
    }

    const encoded = await this.tryEncodeWebp(blob);
    if (!encoded || encoded.size === 0) {
      return blob;
    }

    if (encoded.size >= blob.size * 0.98) {
      return blob;
    }

    return encoded;
  }

  private async tryEncodeWebp(blob: Blob): Promise<Blob | null> {
    if (typeof createImageBitmap !== "function") {
      return null;
    }

    const bitmap = await createImageBitmap(blob);
    try {
      if (bitmap.width <= 0 || bitmap.height <= 0) {
        return null;
      }

      if (typeof OffscreenCanvas !== "undefined") {
        const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
        const context = canvas.getContext("2d");
        if (!context) {
          return null;
        }
        context.drawImage(bitmap, 0, 0);
        return await canvas.convertToBlob({ type: "image/webp", quality: WEBP_QUALITY });
      }

      if (typeof document === "undefined") {
        return null;
      }

      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext("2d");
      if (!context) {
        return null;
      }
      context.drawImage(bitmap, 0, 0);

      return await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((encoded) => resolve(encoded), "image/webp", WEBP_QUALITY);
      });
    } catch {
      return null;
    } finally {
      bitmap.close();
    }
  }

  private async evictIfNeeded(): Promise<void> {
    const rows = await imageCacheDb.images.orderBy("lastAccessed").toArray();
    let total = rows.reduce((sum, row) => sum + (row.size ?? row.blob.size ?? 0), 0);

    for (const row of rows) {
      if (total <= MAX_CACHE_BYTES) {
        break;
      }
      await imageCacheDb.images.delete(row.id);
      total -= row.size ?? row.blob.size ?? 0;
    }
  }
}

export const imageCache = new ImageCache();
