import { TrackEntity } from "../types/library";
import { QueueItem } from "../types/playback";
import { SubsonicSong } from "../types/subsonic";

export const trackToSong = (track: TrackEntity): SubsonicSong => ({
  id: track.id,
  title: track.title,
  album: track.albumName,
  albumId: track.albumId,
  artist: track.artistName,
  artistId: track.artistId,
  track: track.trackNumber,
  discNumber: track.discNumber,
  duration: track.duration,
  bitRate: track.bitRate,
  bitDepth: track.bitDepth,
  samplingRate: track.samplingRate,
  year: track.year,
  genre: track.genre,
  coverArt: track.coverArt,
  suffix: track.suffix,
});

export const songToQueueItem = (song: SubsonicSong, coverArtUrl?: string): QueueItem => ({
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

export const queueItemToSong = (item: QueueItem): SubsonicSong => ({
  id: item.id,
  title: item.title,
  artist: item.artist,
  album: item.album,
  albumId: item.albumId,
  duration: item.duration,
  track: item.trackNumber,
  coverArt: item.coverArt,
  bitDepth: item.bitDepth,
  samplingRate: item.samplingRate,
  suffix: item.suffix,
});
