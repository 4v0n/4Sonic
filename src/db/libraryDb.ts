import Dexie, { Table } from "dexie";
import { AlbumEntity, ArtistEntity, LibrarySnapshot, TrackEntity } from "../types/library";

export interface LibraryMetaRow {
  key: "library";
  signature?: string;
  indexedAt?: number;
  serverUrl?: string;
  schemaVersion?: number;
}

export const LIBRARY_SCHEMA_VERSION = 2;

class LibraryDatabase extends Dexie {
  public artists!: Table<ArtistEntity, string>;
  public albums!: Table<AlbumEntity, string>;
  public tracks!: Table<TrackEntity, string>;
  public meta!: Table<LibraryMetaRow, string>;

  public constructor() {
    super("fourSonicLibrary");
    this.version(1).stores({
      artists: "&id,name",
      albums: "&id,artistId,title",
      tracks: "&id,albumId,artistId,title",
      meta: "&key",
    });
  }
}

export const libraryDb = new LibraryDatabase();

export const saveLibrarySnapshot = async (snapshot: LibrarySnapshot): Promise<void> => {
  await libraryDb.transaction("rw", libraryDb.artists, libraryDb.albums, libraryDb.tracks, libraryDb.meta, async () => {
    await libraryDb.tracks.clear();
    await libraryDb.albums.clear();
    await libraryDb.artists.clear();

    if (snapshot.tracks.length > 0) {
      await libraryDb.tracks.bulkPut(snapshot.tracks);
    }

    if (snapshot.albums.length > 0) {
      await libraryDb.albums.bulkPut(snapshot.albums);
    }

    if (snapshot.artists.length > 0) {
      await libraryDb.artists.bulkPut(snapshot.artists);
    }

    await libraryDb.meta.put({
      key: "library",
      signature: snapshot.signature,
      indexedAt: snapshot.indexedAt,
      serverUrl: snapshot.serverUrl,
      schemaVersion: LIBRARY_SCHEMA_VERSION,
    });
  });
};

export const loadLibrarySnapshot = async (): Promise<LibrarySnapshot | null> => {
  const metaRow = await libraryDb.meta.get("library");
  if (!metaRow?.signature || !metaRow.indexedAt || !metaRow.serverUrl) {
    return null;
  }

  if (metaRow.schemaVersion !== LIBRARY_SCHEMA_VERSION) {
    await clearLibrarySnapshot();
    return null;
  }

  const [artists, albums, tracks] = await Promise.all([
    libraryDb.artists.toArray(),
    libraryDb.albums.toArray(),
    libraryDb.tracks.toArray(),
  ]);

  if (artists.length === 0 && albums.length === 0 && tracks.length === 0) {
    return null;
  }

  return {
    artists,
    albums,
    tracks,
    signature: metaRow.signature,
    indexedAt: metaRow.indexedAt,
    serverUrl: metaRow.serverUrl,
  };
};

export const clearLibrarySnapshot = async (): Promise<void> => {
  await libraryDb.transaction("rw", libraryDb.artists, libraryDb.albums, libraryDb.tracks, libraryDb.meta, async () => {
    await libraryDb.tracks.clear();
    await libraryDb.albums.clear();
    await libraryDb.artists.clear();
    await libraryDb.meta.delete("library");
  });
};
