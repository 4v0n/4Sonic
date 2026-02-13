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

const enqueueAndPlay = async (
  songs: SubsonicSong[],
  startIndex = 0,
  options?: PrepareSongsOptions,
): Promise<void> => {
  const client = ensureClient();
  const normalized = prepareSongs(songs, options);

  if (normalized.length === 0) {
    throw new Error("No playable songs available.");
  }

  const queueItems = normalized.map((song) => songToQueueItem(
    song,
    getCoverArtUrl(client, song.coverArt),
  ));

  const store = usePlaybackStore.getState();
  const insertionIndex = store.queuePosition >= 0 ? store.queuePosition + 1 : 0;
  const targetIndex = Math.min(Math.max(startIndex, 0), queueItems.length - 1);

  store.addToQueueFront(queueItems);
  await store.playFromQueue(insertionIndex + targetIndex);
};

export const playSongById = async (songId: string): Promise<void> => {
  const client = ensureClient();
  const { song } = await client.getSong(songId);
  await enqueueAndPlay([song], 0, { sort: false });
};

export const playSong = async (song: SubsonicSong): Promise<void> => {
  if (!song?.id) {
    throw new Error("Song is missing an id.");
  }
  await enqueueAndPlay([song], 0, { sort: false });
};

export const playAlbum = async (
  album: SubsonicAlbumDetail | string,
  options?: { startSongId?: string },
): Promise<void> => {
  const client = ensureClient();
  const albumDetail = typeof album === "string" ? (await client.getAlbum(album)).album : album;
  const songs = albumDetail.song ?? [];
  const normalized = prepareSongs(songs, { sort: true });
  const startIndex = options?.startSongId
    ? normalized.findIndex((song) => song.id === options.startSongId)
    : 0;

  await enqueueAndPlay(normalized, startIndex >= 0 ? startIndex : 0, { sort: false });
};

export const playArtist = async (
  artist: SubsonicArtistDetail | string,
  options?: { fallbackSongs?: SubsonicSong[] },
): Promise<void> => {
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

  if (!songs.length) {
    throw new Error("No songs available for this artist.");
  }

  await enqueueAndPlay(songs, 0, { sort: true });
};
