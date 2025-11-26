import { create } from "zustand";
import { loadLibrarySnapshot, saveLibrarySnapshot } from "../db/libraryDb";
import { AlbumEntity, ArtistEntity, TrackEntity } from "../types/library";
import { SubsonicAlbumDetail, SubsonicAlbumSummary, SubsonicArtist, SubsonicArtistDetail, SubsonicArtistIndex, SubsonicSong } from "../types/subsonic";
import { hashString } from "../utils/hash";
import { SubsonicClient } from "../services/subsonic/client";

type LibraryStatus = "idle" | "checking" | "indexing" | "ready" | "error";

type LibrarySyncResult = "cache" | "remote" | null;

interface LibraryState {
  artists: ArtistEntity[];
  albums: AlbumEntity[];
  tracks: TrackEntity[];
  status: LibraryStatus;
  signature?: string;
  indexedAt?: number;
  error?: string;
  bootstrap: (client: SubsonicClient, options?: { force?: boolean }) => Promise<LibrarySyncResult>;
  reset: () => void;
}

const ARTIST_CONCURRENCY = 6;
const ALBUM_CONCURRENCY = 4;

const flattenArtists = (indexes: SubsonicArtistIndex[]): SubsonicArtist[] => {
  return indexes.flatMap((group) => group.artist ?? []);
};

const buildArtistsSignature = (artists: SubsonicArtist[]): string => {
  if (artists.length === 0) {
    return hashString("empty");
  }
  const sorted = artists
    .map((artist) => `${artist.id}:${artist.name}:${artist.albumCount}`)
    .sort((left, right) => left.localeCompare(right));
  return hashString(sorted.join("|"));
};

const mapArtist = (artist: SubsonicArtistDetail): ArtistEntity => ({
  id: artist.id,
  name: artist.name,
  albumCount: artist.albumCount,
  coverArt: artist.coverArt,
  artistImageUrl: artist.artistImageUrl,
  starred: artist.starred,
});

const mapAlbum = (album: SubsonicAlbumDetail): AlbumEntity => ({
  id: album.id,
  title: album.name,
  artistId: album.artistId ?? album.song?.[0]?.artistId ?? "",
  artistName: album.artist ?? album.song?.[0]?.artist ?? "",
  songCount: album.songCount ?? album.song?.length,
  duration: album.duration,
  created: album.created,
  year: album.year,
  genre: album.genre,
  coverArt: album.coverArt,
});

const mapTrack = (song: SubsonicSong): TrackEntity => ({
  id: song.id,
  title: song.title,
  albumId: song.albumId,
  albumName: song.album,
  artistId: song.artistId,
  artistName: song.artist,
  duration: song.duration,
  trackNumber: song.track,
  discNumber: song.discNumber,
  bitRate: song.bitRate,
  year: song.year,
  genre: song.genre,
  coverArt: song.coverArt,
});

const processWithConcurrency = async <T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
): Promise<void> => {
  if (items.length === 0) {
    return;
  }

  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const currentIndex = cursor;
      cursor += 1;
      await worker(items[currentIndex]);
    }
  });

  await Promise.all(workers);
};

export const useLibraryStore = create<LibraryState>((set, get) => ({
  artists: [],
  albums: [],
  tracks: [],
  status: "idle",
  error: undefined,
  signature: undefined,
  indexedAt: undefined,
  bootstrap: async (client, options) => {
    const { status } = get();
    if (status === "indexing" && !options?.force) {
      return null;
    }

    try {
      set({ status: "checking", error: undefined });
      const cachedSnapshot = await loadLibrarySnapshot();

      if (cachedSnapshot && cachedSnapshot.serverUrl === client.getServerUrl()) {
        set({
          artists: cachedSnapshot.artists,
          albums: cachedSnapshot.albums,
          tracks: cachedSnapshot.tracks,
          signature: cachedSnapshot.signature,
          indexedAt: cachedSnapshot.indexedAt,
          status: "checking",
        });
      }

      const artistsResponse = await client.getArtists();
      const indexes = artistsResponse.artists.index;
      const flattenedArtists = flattenArtists(indexes);
      const remoteSignature = buildArtistsSignature(flattenedArtists);

      if (
        !options?.force &&
        cachedSnapshot &&
        cachedSnapshot.signature === remoteSignature &&
        cachedSnapshot.serverUrl === client.getServerUrl()
      ) {
        set({
          artists: cachedSnapshot.artists,
          albums: cachedSnapshot.albums,
          tracks: cachedSnapshot.tracks,
          status: "ready",
          signature: cachedSnapshot.signature,
          indexedAt: cachedSnapshot.indexedAt,
          error: undefined,
        });
        return "cache";
      }

      set({
        status: "indexing",
        artists: [],
        albums: [],
        tracks: [],
        signature: remoteSignature,
        indexedAt: undefined,
      });

      const artistAccumulator = new Map<string, ArtistEntity>();
      const albumAccumulator = new Map<string, AlbumEntity>();
      const trackAccumulator = new Map<string, TrackEntity>();

      const publishArtists = (entities: ArtistEntity[]) => {
        let mutated = false;
        entities.forEach((entity) => {
          const existing = artistAccumulator.get(entity.id);
          if (!existing) {
            artistAccumulator.set(entity.id, entity);
            mutated = true;
          }
        });
        if (mutated) {
          set({
            artists: Array.from(artistAccumulator.values()),
          });
        }
      };

      const publishAlbums = (entities: AlbumEntity[]) => {
        let mutated = false;
        entities.forEach((entity) => {
          const existing = albumAccumulator.get(entity.id);
          if (!existing) {
            albumAccumulator.set(entity.id, entity);
            mutated = true;
          }
        });
        if (mutated) {
          set({
            albums: Array.from(albumAccumulator.values()),
          });
        }
      };

      const publishTracks = (entities: TrackEntity[]) => {
        let mutated = false;
        entities.forEach((entity) => {
          if (!entity.id) {
            return;
          }
          const existing = trackAccumulator.get(entity.id);
          if (!existing) {
            trackAccumulator.set(entity.id, entity);
            mutated = true;
          }
        });
        if (mutated) {
          set({
            tracks: Array.from(trackAccumulator.values()),
          });
        }
      };

      const collectedAlbumSummaries: SubsonicAlbumSummary[] = [];

      await processWithConcurrency(flattenedArtists, ARTIST_CONCURRENCY, async (artistSummary) => {
        const response = await client.getArtist(artistSummary.id);
        const detail = response.artist;
        publishArtists([mapArtist(detail)]);
        if (detail.album) {
          collectedAlbumSummaries.push(...detail.album);
        }
      });

      const uniqueAlbumSummaries = Array.from(
        new Map(collectedAlbumSummaries.map((album) => [album.id, album])).values(),
      );

      await processWithConcurrency(uniqueAlbumSummaries, ALBUM_CONCURRENCY, async (albumSummary) => {
        const response = await client.getAlbum(albumSummary.id);
        const albumDetail = response.album;
        publishAlbums([mapAlbum(albumDetail)]);
        const tracks = (albumDetail.song ?? []).map(mapTrack);
        if (tracks.length > 0) {
          publishTracks(tracks);
        }
      });

      const snapshot = {
        artists: Array.from(artistAccumulator.values()),
        albums: Array.from(albumAccumulator.values()),
        tracks: Array.from(trackAccumulator.values()),
        signature: remoteSignature,
        indexedAt: Date.now(),
        serverUrl: client.getServerUrl(),
      };

      await saveLibrarySnapshot(snapshot);

      set({
        artists: snapshot.artists,
        albums: snapshot.albums,
        tracks: snapshot.tracks,
        signature: snapshot.signature,
        indexedAt: snapshot.indexedAt,
        status: "ready",
      });

      return "remote";
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to index library";
      set({ status: "error", error: message });
      throw error;
    }
  },
  reset: () => {
    set({
      artists: [],
      albums: [],
      tracks: [],
      status: "idle",
      signature: undefined,
      indexedAt: undefined,
      error: undefined,
    });
  },
}));
