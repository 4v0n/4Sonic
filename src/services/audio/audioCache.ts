import { audioCacheDb, CachedAudioRow } from "../../db/audioCacheDb";

const MAX_CACHE_BYTES = 500 * 1024 * 1024;
const MAX_TRACK_BYTES = 250 * 1024 * 1024;

export interface PlayableSource {
  url: string;
  fromCache: boolean;
  cleanup?: () => void;
  cachePromise?: Promise<void>;
}

class AudioCache {
  private objectUrls = new Map<string, string>();
  private prefetchControllers = new Map<string, AbortController>();

  public async getPlayableSource(
    track: { id: string; url: string; duration?: number },
    options?: { allowPrefetch?: boolean },
  ): Promise<PlayableSource> {
    if (typeof indexedDB === "undefined") {
      return { url: track.url, fromCache: false };
    }

    const cached = await this.readCached(track.id);
    if (cached) {
      const url = this.createObjectUrl(track.id, cached.blob);
      return {
        url,
        fromCache: true,
        cleanup: () => this.release(track.id),
      };
    }

    if (options?.allowPrefetch === false) {
      return { url: track.url, fromCache: false };
    }

    const cachePromise = this.prefetch(track);
    return { url: track.url, fromCache: false, cachePromise };
  }


  public async ensureCached(track: { id: string; url: string; duration?: number }): Promise<void> {
    if (typeof indexedDB === "undefined") {
      return;
    }
    const existing = await audioCacheDb.tracks.get(track.id);
    if (existing) {
      return;
    }
    await this.prefetch(track);
  }

  public cancelOtherPrefetches(keepId?: string): void {
    for (const [id, controller] of this.prefetchControllers.entries()) {
      if (id === keepId) continue;
      controller.abort();
      this.prefetchControllers.delete(id);
    }
  }

  private async readCached(id: string): Promise<CachedAudioRow | null> {
    const row = await audioCacheDb.tracks.get(id);
    if (row) {
      void audioCacheDb.tracks.update(id, { lastAccessed: Date.now() });
      return row;
    }
    return null;
  }

  private createObjectUrl(id: string, blob: Blob): string {
    const existing = this.objectUrls.get(id);
    if (existing) {
      URL.revokeObjectURL(existing);
    }
    const url = URL.createObjectURL(blob);
    this.objectUrls.set(id, url);
    return url;
  }

  public release(id: string): void {
    const url = this.objectUrls.get(id);
    if (url) {
      URL.revokeObjectURL(url);
      this.objectUrls.delete(id);
    }
  }

  private async prefetch(track: { id: string; url: string; duration?: number }): Promise<void> {
    if (this.prefetchControllers.has(track.id)) {
      return;
    }
    if (typeof indexedDB === "undefined") {
      return;
    }

    const controller = new AbortController();
    this.prefetchControllers.set(track.id, controller);

    try {
      const response = await fetch(track.url, { signal: controller.signal, cache: "no-store" });
      if (!response.ok || !response.body) {
        return;
      }

      const contentLength = Number(response.headers.get("content-length") ?? 0);
      if (contentLength && contentLength > MAX_TRACK_BYTES) {
        await response.body.cancel();
        return;
      }

      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let received = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!value) continue;
        received += value.byteLength;
        if (received > MAX_TRACK_BYTES) {
          await reader.cancel("Too large to cache");
          return;
        }
        chunks.push(value);
      }

      if (received === 0) {
        return;
      }

      const mimeType = response.headers.get("content-type") ?? undefined;
      const blob = new Blob(chunks, { type: mimeType });
      const row: CachedAudioRow = {
        id: track.id,
        url: track.url,
        blob,
        mimeType,
        duration: track.duration,
        size: blob.size,
        createdAt: Date.now(),
        lastAccessed: Date.now(),
      };

      await audioCacheDb.transaction("rw", audioCacheDb.tracks, async () => {
        await audioCacheDb.tracks.put(row);
        await this.evictIfNeeded();
      });
    } catch (error) {
      if (!(error instanceof DOMException) || error.name !== "AbortError") {
        console.warn("Audio cache prefetch failed", error);
      }
    } finally {
      this.prefetchControllers.delete(track.id);
    }
  }

  private async evictIfNeeded(): Promise<void> {
    const rows = await audioCacheDb.tracks.orderBy("lastAccessed").toArray();
    let total = rows.reduce((sum, row) => sum + (row.size ?? row.blob.size ?? 0), 0);

    for (const row of rows) {
      if (total <= MAX_CACHE_BYTES) break;
      await audioCacheDb.tracks.delete(row.id);
      this.release(row.id);
      total -= row.size ?? row.blob.size ?? 0;
    }
  }
}

export const audioCache = new AudioCache();
