import { QueueItem, usePlaybackStore } from "../store/playbackStore";
import { useAuthStore } from "../store/authStore";
import { useLibraryStore } from "../store/libraryStore";
import { SubsonicAlbumDetail, SubsonicArtistDetail, SubsonicSong } from "../types/subsonic";
import { TrackEntity } from "../types/library";

type PrepareSongsOptions = {
  sort?: boolean;
};

const sortSongsForQueue = (songs: SubsonicSong[]): SubsonicSong[] => {
  return [...songs].sort((left, right) => {
    const leftAlbum = left.album ?? "";
    const rightAlbum = right.album ?? "";
    if (leftAlbum !== rightAlbum) return leftAlbum.localeCompare(rightAlbum);

    const leftDisc = left.discNumber ?? 0;
    const rightDisc = right.discNumber ?? 0;
    if (leftDisc !== rightDisc) return leftDisc - rightDisc;

    const leftTrack = left.track ?? 0;
    const rightTrack = right.track ?? 0;
    if (leftTrack !== rightTrack) return leftTrack - rightTrack;

    const leftTitle = left.title ?? "";
    const rightTitle = right.title ?? "";
    return leftTitle.localeCompare(rightTitle);
  });
};

const trackToSong = (track: TrackEntity): SubsonicSong => ({
  id: track.id,
  title: track.title,
  album: track.albumName,
  albumId: track.albumId,
  artist: track.artistName,
  artistId: track.artistId,
  track: track.trackNumber,
  discNumber: track.discNumber,
  duration: track.duration,
  bitDepth: track.bitDepth,
  samplingRate: track.samplingRate,
  coverArt: track.coverArt,
  suffix: track.suffix,
});

const ensureClient = () => {
  const session = useAuthStore.getState().session;
  if (!session) {
    throw new Error("Not authenticated");
  }
  return session.client;
};

const prepareSongs = (songs: SubsonicSong[], options?: PrepareSongsOptions): SubsonicSong[] => {
  const filtered = songs.filter((song): song is SubsonicSong & { id: string } => Boolean(song?.id));
  if (filtered.length === 0) {
    return [];
  }
  if (options?.sort === false) {
    return filtered;
  }
  return sortSongsForQueue(filtered);
};

const mapSongToQueueItem = (song: SubsonicSong, coverArtUrl?: string): QueueItem => ({
  id: song.id,
  title: song.title,
  artist: song.artist,
  album: song.album,
  albumId: song.albumId,
  duration: song.duration,
  coverArt: song.coverArt,
  coverArtUrl,
  trackNumber: song.track,
  bitDepth: song.bitDepth,
  samplingRate: song.samplingRate,
  suffix: song.suffix,
});

const setQueueFromSongs = async (
  songs: SubsonicSong[],
  startIndex = 0,
  options?: PrepareSongsOptions,
): Promise<void> => {
  const client = ensureClient();
  const normalized = prepareSongs(songs, options);

  if (normalized.length === 0) {
    throw new Error("No playable songs available.");
  }

  const queueItems: QueueItem[] = normalized.map((song) => mapSongToQueueItem(
    song,
    client.getCoverArtUrl(song.coverArt, { size: 512 }),
  ));

  const targetIndex = Math.min(Math.max(startIndex, 0), queueItems.length - 1);
  await usePlaybackStore.getState().setQueue(queueItems, targetIndex);
};

export const playSongById = async (songId: string): Promise<void> => {
  const client = ensureClient();
  const { song } = await client.getSong(songId);
  await setQueueFromSongs([song], 0, { sort: false });
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

  await setQueueFromSongs(normalized, startIndex >= 0 ? startIndex : 0, { sort: false });
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

  await setQueueFromSongs(songs, 0, { sort: true });
};
