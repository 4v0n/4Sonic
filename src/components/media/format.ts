export const formatCount = (count: number, singular: string, pluralForm = `${singular}s`) =>
  `${count.toLocaleString()} ${count === 1 ? singular : pluralForm}`;

export const formatAlbumCount = (albumCount?: number) =>
  albumCount ? formatCount(albumCount, "album") : undefined;

export const formatSongMeta = (albumName?: string, year?: number) => {
  const parts = [albumName, year ? String(year) : undefined].filter(Boolean);
  return parts.length > 0 ? parts.join(" • ") : undefined;
};
