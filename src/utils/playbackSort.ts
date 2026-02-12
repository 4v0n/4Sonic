import { SubsonicSong } from "../types/subsonic";

export const sortSongsForQueue = (songs: SubsonicSong[]): SubsonicSong[] => {
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
