export interface ArtistEntity {
  id: string;
  name: string;
  albumCount: number;
  coverArt?: string;
  artistImageUrl?: string;
  starred?: string;
}

export interface AlbumEntity {
  id: string;
  title: string;
  artistId: string;
  artistName: string;
  songCount?: number;
  duration?: number;
  created?: string;
  year?: number;
  genre?: string;
  coverArt?: string;
}

export interface TrackEntity {
  id: string;
  title: string;
  albumId?: string;
  albumName?: string;
  artistId?: string;
  artistName?: string;
  duration?: number;
  trackNumber?: number;
  discNumber?: number;
  bitRate?: number;
  year?: number;
  genre?: string;
  coverArt?: string;
}

export interface LibraryMeta {
  serverUrl: string;
  signature: string;
  indexedAt: number;
}

export interface LibrarySnapshot extends LibraryMeta {
  artists: ArtistEntity[];
  albums: AlbumEntity[];
  tracks: TrackEntity[];
}

