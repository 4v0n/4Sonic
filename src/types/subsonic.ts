export type SubsonicStatus = "ok" | "failed";

export interface SubsonicError {
  code: number;
  message: string;
}

export interface SubsonicResponseEnvelope<TPayload> {
  "subsonic-response": SubsonicResponse<TPayload>;
}

export type SubsonicResponse<TPayload> = {
  status: SubsonicStatus;
  version: string;
  serverVersion?: string;
  type?: string;
  error?: SubsonicError;
} & TPayload;

export interface SubsonicArtistsResponse {
  artists: SubsonicArtists;
}

export interface SubsonicIndexesResponse {
  indexes: SubsonicIndexes;
}

export interface SubsonicArtists {
  ignoredArticles?: string;
  index: SubsonicArtistIndex[];
}

export interface SubsonicIndexes {
  ignoredArticles?: string;
  lastModified?: number;
  index: SubsonicArtistIndex[];
}

export interface SubsonicArtistIndex {
  name: string;
  artist?: SubsonicArtist[];
}

export interface SubsonicArtist {
  id: string;
  name: string;
  albumCount: number;
  coverArt?: string;
  artistImageUrl?: string;
  starred?: string;
}

export interface SubsonicArtistDetail extends SubsonicArtist {
  album?: SubsonicAlbumSummary[];
  biography?: string;
  genre?: string;
  musicBrainzId?: string;
  similarArtist?: SubsonicArtist[];
}

export interface SubsonicArtistResponse {
  artist: SubsonicArtistDetail;
}

export interface SubsonicAlbumSummary {
  id: string;
  name: string;
  artistId?: string;
  artist?: string;
  songCount?: number;
  duration?: number;
  created?: string;
  year?: number;
  genre?: string;
  coverArt?: string;
}

export interface SubsonicAlbumDetail extends SubsonicAlbumSummary {
  song?: SubsonicSong[];
}

export interface SubsonicAlbumResponse {
  album: SubsonicAlbumDetail;
}

export interface SubsonicSong {
  id: string;
  title: string;
  album?: string;
  albumId?: string;
  artist?: string;
  artistId?: string;
  track?: number;
  discNumber?: number;
  duration?: number;
  bitRate?: number;
  year?: number;
  genre?: string;
  size?: number;
  suffix?: string;
  contentType?: string;
  isDir?: boolean;
  coverArt?: string;
  path?: string;
  type?: string;
}
