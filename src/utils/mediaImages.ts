import { SubsonicClient } from "../services/subsonic/client";

export const DEFAULT_COVER_SIZE = 512;

const parseUrl = (value: string, base?: string): URL | null => {
  try {
    return new URL(value, base);
  } catch {
    return null;
  }
};

const resizeServerImageUrl = (url: string, client?: SubsonicClient, size = DEFAULT_COVER_SIZE): string => {
  const base = client?.getServerUrl();
  const parsed = parseUrl(url, base);
  if (!parsed) {
    return url;
  }

  if (client) {
    const serverOrigin = parseUrl(client.getServerUrl())?.origin;
    if (serverOrigin && parsed.origin !== serverOrigin) {
      return url;
    }
  }

  if (!parsed.pathname.includes("getCoverArt.view")) {
    return url;
  }

  parsed.searchParams.set("size", String(size));
  return parsed.toString();
};

export const getCoverArtUrl = (
  client: SubsonicClient | undefined,
  coverArtId?: string,
  size = DEFAULT_COVER_SIZE,
): string | undefined => {
  if (!client || !coverArtId) {
    return undefined;
  }
  return client.getCoverArtUrl(coverArtId, { size });
};

export const getArtistImageUrl = (
  artist: { artistImageUrl?: string; coverArt?: string } | undefined,
  client: SubsonicClient | undefined,
  size = DEFAULT_COVER_SIZE,
): string | undefined => {
  if (!artist) {
    return undefined;
  }
  if (artist.artistImageUrl) {
    return resizeServerImageUrl(artist.artistImageUrl, client, size);
  }
  return getCoverArtUrl(client, artist.coverArt, size);
};

export const getAlbumCoverUrl = (
  album: { coverArt?: string } | undefined,
  client: SubsonicClient | undefined,
  size = DEFAULT_COVER_SIZE,
): string | undefined => {
  if (!album) {
    return undefined;
  }
  return getCoverArtUrl(client, album.coverArt, size);
};

export const getSongCoverUrl = (
  song: { coverArt?: string } | undefined,
  album: { coverArt?: string } | undefined,
  client: SubsonicClient | undefined,
  size = DEFAULT_COVER_SIZE,
): string | undefined => {
  const coverArtId = song?.coverArt ?? album?.coverArt;
  return getCoverArtUrl(client, coverArtId, size);
};
