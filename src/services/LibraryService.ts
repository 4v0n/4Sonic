import { endpoints } from "../constants/SubsonicEndpoints";
import { useApiStore } from "../store/ApiStore";
import makeRequest from "../utils/MakeRequest";
import { db, library, Artist, Album, Song, Playlist } from "../database/SubsonicDb";

const LIBRARY_VERSION_KEY = "libraryVersion";

async function fetchRemoteLibraryVersion(): Promise<number> {
  const { url, reqParams } = useApiStore.getState();
  const res = await makeRequest(url, endpoints.library.indexes, {
    method: "GET",
    queryParams: { ...reqParams },
  });
  if (!res.ok) {
    throw new Error(`Server responded with status ${res.status}`);
  }
  const json = await res.json();
  const subRes = json["subsonic-response"];
  return subRes.indexes?.lastModified ?? Date.now();
}

async function storeLibraryVersion(version: number) {
  await db.meta.put({ key: LIBRARY_VERSION_KEY, value: String(version) });
}

async function getStoredLibraryVersion(): Promise<number | undefined> {
  const entry = await db.meta.get(LIBRARY_VERSION_KEY);
  return entry ? Number(entry.value) : undefined;
}

async function fetchArtists(): Promise<Artist[]> {
  const { url, reqParams } = useApiStore.getState();
  const res = await makeRequest(url, endpoints.library.indexes, {
    method: "GET",
    queryParams: { ...reqParams },
  });
  if (!res.ok) {
    throw new Error(`Server responded with status ${res.status}`);
  }
  const json = await res.json();
  const subRes = json["subsonic-response"];
  const artists: Artist[] = [];
  if (subRes.indexes && Array.isArray(subRes.indexes.index)) {
    for (const idx of subRes.indexes.index) {
      if (Array.isArray(idx.artist)) {
        for (const art of idx.artist) {
          artists.push({ id: art.id, name: art.name, albumCount: art.albumCount });
        }
      }
    }
  }
  return artists;
}

async function fetchAlbumsByArtist(artistId: string): Promise<Album[]> {
  const { url, reqParams } = useApiStore.getState();
  const res = await makeRequest(url, endpoints.library.artist, {
    method: "GET",
    queryParams: { ...reqParams, id: artistId },
  });
  if (!res.ok) {
    throw new Error(`Server responded with status ${res.status}`);
  }
  const json = await res.json();
  const subRes = json["subsonic-response"];
  const albums: Album[] = [];
  if (subRes.artist && Array.isArray(subRes.artist.album)) {
    for (const alb of subRes.artist.album) {
      albums.push({ id: alb.id, artistId: artistId, name: alb.name, songCount: alb.songCount });
    }
  }
  return albums;
}

async function fetchSongsByAlbum(albumId: string, artistId: string): Promise<Song[]> {
  const { url, reqParams } = useApiStore.getState();
  const res = await makeRequest(url, endpoints.library.album, {
    method: "GET",
    queryParams: { ...reqParams, id: albumId },
  });
  if (!res.ok) {
    throw new Error(`Server responded with status ${res.status}`);
  }
  const json = await res.json();
  const subRes = json["subsonic-response"];
  const songs: Song[] = [];
  if (subRes.album && Array.isArray(subRes.album.song)) {
    for (const s of subRes.album.song) {
      songs.push({
        id: s.id,
        albumId,
        artistId,
        title: s.title,
        track: s.track,
        duration: s.duration,
      });
    }
  }
  return songs;
}

async function fetchPlaylists(): Promise<Playlist[]> {
  const { url, reqParams } = useApiStore.getState();
  const res = await makeRequest(url, endpoints.library.playlists, {
    method: "GET",
    queryParams: { ...reqParams },
  });
  if (!res.ok) {
    throw new Error(`Server responded with status ${res.status}`);
  }
  const json = await res.json();
  const subRes = json["subsonic-response"];
  const playlists: Playlist[] = [];
  if (subRes.playlists && Array.isArray(subRes.playlists.playlist)) {
    for (const pl of subRes.playlists.playlist) {
      playlists.push({ id: pl.id, name: pl.name, songIds: [] });
    }
  }
  for (const pl of playlists) {
    const songs = await fetchPlaylistSongs(pl.id);
    pl.songIds = songs.map((s) => s.id);
  }
  return playlists;
}

async function fetchPlaylistSongs(id: string): Promise<Song[]> {
  const { url, reqParams } = useApiStore.getState();
  const res = await makeRequest(url, endpoints.library.playlist, {
    method: "GET",
    queryParams: { ...reqParams, id },
  });
  if (!res.ok) {
    throw new Error(`Server responded with status ${res.status}`);
  }
  const json = await res.json();
  const subRes = json["subsonic-response"];
  const songs: Song[] = [];
  if (subRes.playlist && Array.isArray(subRes.playlist.entry)) {
    for (const s of subRes.playlist.entry) {
      songs.push({
        id: s.id,
        albumId: s.albumId,
        artistId: s.artistId,
        title: s.title,
        track: s.track,
        duration: s.duration,
      });
    }
  }
  return songs;
}

export async function indexLibrary(force = false) {
  const remoteVersion = await fetchRemoteLibraryVersion();
  const localVersion = await getStoredLibraryVersion();
  if (!force && localVersion && remoteVersion === localVersion) {
    return;
  }
  const artists = await fetchArtists();
  const albums: Album[] = [];
  const songs: Song[] = [];
  for (const artist of artists) {
    const artistAlbums = await fetchAlbumsByArtist(artist.id);
    albums.push(...artistAlbums);
    for (const alb of artistAlbums) {
      const albumSongs = await fetchSongsByAlbum(alb.id, artist.id);
      songs.push(...albumSongs);
    }
  }
  const playlists = await fetchPlaylists();

  await db.transaction("rw", db.artists, db.albums, db.songs, db.playlists, db.meta, async () => {
    await db.artists.clear();
    await db.albums.clear();
    await db.songs.clear();
    await db.playlists.clear();
    await db.meta.clear();
    await db.artists.bulkAdd(artists);
    await db.albums.bulkAdd(albums);
    await db.songs.bulkAdd(songs);
    await db.playlists.bulkAdd(playlists);
    await storeLibraryVersion(remoteVersion);
  });
}

export async function reindexLibrary() {
  await indexLibrary(true);
}

export async function libraryNeedsUpdate(): Promise<boolean> {
  const remoteVersion = await fetchRemoteLibraryVersion();
  const localVersion = await getStoredLibraryVersion();
  return !localVersion || localVersion !== remoteVersion;
}

export { library };
