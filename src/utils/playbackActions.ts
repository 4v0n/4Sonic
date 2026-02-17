import { usePlaybackStore } from "../store/playbackStore";
import { useAuthStore } from "../store/authStore";
import { useLibraryStore } from "../store/libraryStore";
import { SubsonicAlbumDetail, SubsonicArtistDetail, SubsonicSong } from "../types/subsonic";
import { songToQueueItem, trackToSong } from "./playbackMapping";
import { sortSongsForQueue } from "./playbackSort";
import { getCoverArtUrl } from "./mediaImages";

type PrepareSongsOptions = {
  sort?: boolean;
};

type ArtistResolutionOptions = {
  fallbackSongs?: SubsonicSong[];
};

const isPlayableSong = (song?: SubsonicSong | null): song is SubsonicSong & { id: string } => {
  return Boolean(song?.id) && !song?.isDir;
};

const ensureClient = () => {
  const session = useAuthStore.getState().session;
  if (!session) {
    throw new Error("Not authenticated");
  }
  return session.client;
};

const prepareSongs = (songs: SubsonicSong[], options?: PrepareSongsOptions): SubsonicSong[] => {
  const filtered = songs.filter(isPlayableSong);
  if (filtered.length === 0) {
    return [];
  }
  if (options?.sort === false) {
    return filtered;
  }
  return sortSongsForQueue(filtered);
};

const toQueueItems = (songs: SubsonicSong[], options?: PrepareSongsOptions) => {
  const client = ensureClient();
  const normalized = prepareSongs(songs, options);
  if (normalized.length === 0) {
    throw new Error("No playable songs available.");
  }
  const queueItems = normalized.map((song) => songToQueueItem(
    song,
    getCoverArtUrl(client, song.coverArt),
  ));
  return { normalized, queueItems };
};

const replaceRegularQueueAndPlay = async (
  songs: SubsonicSong[],
  startIndex = 0,
  options?: PrepareSongsOptions,
): Promise<void> => {
  const { queueItems } = toQueueItems(songs, options);
  const targetIndex = Math.min(Math.max(startIndex, 0), queueItems.length - 1);
  await usePlaybackStore.getState().setQueue(queueItems, targetIndex);
};

const queuePriority = (
  songs: SubsonicSong[],
  mode: "next" | "append",
  options?: PrepareSongsOptions,
): void => {
  const { queueItems } = toQueueItems(songs, options);
  const store = usePlaybackStore.getState();
  if (mode === "next") {
    store.addToQueueFront(queueItems);
  } else {
    store.addToQueue(queueItems);
  }
};

const resolveAlbumSongs = async (album: SubsonicAlbumDetail | string): Promise<SubsonicSong[]> => {
  const client = ensureClient();
  const albumDetail = typeof album === "string" ? (await client.getAlbum(album)).album : album;
  return albumDetail.song ?? [];
};

const resolveArtistSongs = async (
  artist: SubsonicArtistDetail | string,
  options?: ArtistResolutionOptions,
): Promise<SubsonicSong[]> => {
  const artistId = typeof artist === "string" ? artist : artist.id;
  const client = ensureClient();

  const libraryTracks = useLibraryStore.getState().tracks.filter((track) => track.artistId === artistId);
  let songs: SubsonicSong[] = libraryTracks.length > 0 ? libraryTracks.map(trackToSong) : [];

  if (!songs.length && options?.fallbackSongs?.length) {
    songs = options.fallbackSongs;
  }

  if (!songs.length) {
    const artistDetail = typeof artist === "string" ? (await client.getArtist(artistId)).artist : artist;
    if (artistDetail.album?.length) {
      const albumSongs = await Promise.all(
        artistDetail.album.map(async (album) => {
          try {
            const { album: albumDetail } = await client.getAlbum(album.id);
            return albumDetail.song ?? [];
          } catch {
            return [];
          }
        }),
      );
      songs = albumSongs.flat();
    }
  }

  return songs;
};

export const playSongById = async (songId: string): Promise<void> => {
  const client = ensureClient();
  const { song } = await client.getSong(songId);
  await replaceRegularQueueAndPlay([song], 0, { sort: false });
};

export const playSong = async (song: SubsonicSong): Promise<void> => {
  if (!song?.id) {
    throw new Error("Song is missing an id.");
  }
  await replaceRegularQueueAndPlay([song], 0, { sort: false });
};

export const playAlbum = async (
  album: SubsonicAlbumDetail | string,
  options?: { startSongId?: string },
): Promise<void> => {
  const songs = await resolveAlbumSongs(album);
  const normalized = prepareSongs(songs, { sort: true });
  const startIndex = options?.startSongId
    ? normalized.findIndex((song) => song.id === options.startSongId)
    : 0;

  await replaceRegularQueueAndPlay(normalized, startIndex >= 0 ? startIndex : 0, { sort: false });
};

export const playArtist = async (
  artist: SubsonicArtistDetail | string,
  options?: ArtistResolutionOptions,
): Promise<void> => {
  const songs = await resolveArtistSongs(artist, options);
  if (!songs.length) {
    throw new Error("No songs available for this artist.");
  }
  await replaceRegularQueueAndPlay(songs, 0, { sort: true });
};

export const queueSongNext = async (song: SubsonicSong): Promise<void> => {
  if (!song?.id) {
    throw new Error("Song is missing an id.");
  }
  queuePriority([song], "next", { sort: false });
};

export const addSongToQueue = async (song: SubsonicSong): Promise<void> => {
  if (!song?.id) {
    throw new Error("Song is missing an id.");
  }
  queuePriority([song], "append", { sort: false });
};

export const queueSongNextById = async (songId: string): Promise<void> => {
  const client = ensureClient();
  const { song } = await client.getSong(songId);
  await queueSongNext(song);
};

export const addSongByIdToQueue = async (songId: string): Promise<void> => {
  const client = ensureClient();
  const { song } = await client.getSong(songId);
  await addSongToQueue(song);
};

export const queueAlbumNext = async (album: SubsonicAlbumDetail | string): Promise<void> => {
  const songs = await resolveAlbumSongs(album);
  queuePriority(songs, "next", { sort: true });
};

export const addAlbumToQueue = async (album: SubsonicAlbumDetail | string): Promise<void> => {
  const songs = await resolveAlbumSongs(album);
  queuePriority(songs, "append", { sort: true });
};

export const queueArtistNext = async (
  artist: SubsonicArtistDetail | string,
  options?: ArtistResolutionOptions,
): Promise<void> => {
  const songs = await resolveArtistSongs(artist, options);
  if (!songs.length) {
    throw new Error("No songs available for this artist.");
  }
  queuePriority(songs, "next", { sort: true });
};

export const addArtistToQueue = async (
  artist: SubsonicArtistDetail | string,
  options?: ArtistResolutionOptions,
): Promise<void> => {
  const songs = await resolveArtistSongs(artist, options);
  if (!songs.length) {
    throw new Error("No songs available for this artist.");
  }
  queuePriority(songs, "append", { sort: true });
};
