import Dexie, { Table } from "dexie";

export interface CachedImageRow {
  id: string;
  sourceUrl: string;
  blob: Blob;
  mimeType?: string;
  size: number;
  createdAt: number;
  lastAccessed: number;
}

class ImageCacheDatabase extends Dexie {
  public images!: Table<CachedImageRow, string>;

  public constructor() {
    super("fourSonicImageCache");
    this.version(1).stores({
      images: "&id,lastAccessed",
    });
  }
}

export const imageCacheDb = new ImageCacheDatabase();

export const computeImageCacheUsage = async (): Promise<number> => {
  const rows = await imageCacheDb.images.toArray();
  return rows.reduce((total, row) => total + (row.size ?? row.blob.size ?? 0), 0);
};
