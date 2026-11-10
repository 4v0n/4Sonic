const plural = (count: number, singular: string, pluralForm = `${singular}s`) =>
  `${count} ${count === 1 ? singular : pluralForm}`;

export const formatAlbumCount = (albumCount?: number) =>
  albumCount ? plural(albumCount, "album") : undefined;

export const formatAlbumMeta = (year?: number, songCount?: number) => {
  const parts = [year ? String(year) : undefined, songCount ? plural(songCount, "song") : undefined].filter(Boolean);
  return parts.length > 0 ? parts.join(" • ") : undefined;
};

export const formatSongMeta = (albumName?: string, year?: number) => {
  const parts = [albumName, year ? String(year) : undefined].filter(Boolean);
  return parts.length > 0 ? parts.join(" • ") : undefined;
};
