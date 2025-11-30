import Dexie, { Table } from "dexie";

export interface CachedAudioRow {
  id: string;
  url: string;
  blob: Blob;
  mimeType?: string;
  duration?: number;
  size: number;
  createdAt: number;
  lastAccessed: number;
}

class AudioCacheDatabase extends Dexie {
  public tracks!: Table<CachedAudioRow, string>;

  public constructor() {
    super("fourSonicAudioCache");
    this.version(1).stores({
      tracks: "&id,lastAccessed",
    });
  }
}

export const audioCacheDb = new AudioCacheDatabase();

export const computeAudioCacheUsage = async (): Promise<number> => {
  const rows = await audioCacheDb.tracks.toArray();
  return rows.reduce((total, row) => total + (row.size ?? row.blob.size ?? 0), 0);
};
