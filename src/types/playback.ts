export interface QueueItem {
  id: string;
  title: string;
  artist?: string;
  album?: string;
  albumId?: string;
  artistId?: string;
  coverArt?: string;
  coverArtUrl?: string;
  duration?: number;
  trackNumber?: number;
  bitDepth?: number;
  samplingRate?: number;
  suffix?: string;
}
