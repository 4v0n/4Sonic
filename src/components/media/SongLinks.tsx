import type React from "react";
import { Link } from "react-router-dom";
import { useLibraryStore } from "../../store/libraryStore";
import type { SubsonicSong } from "../../types/subsonic";
import cn from "../../utils/cn";
import Tooltip from "../ui/Tooltip";

const LINK_CLASS = "outline-none hover:underline focus-visible:underline";

interface SongLinksProps {
  song?: SubsonicSong | null;
  fallbackTitle: string;
  fallbackArtist: string;
  titleClassName?: string;
  artistClassName?: string;
}

const SongLinks = ({ song, fallbackTitle, fallbackArtist, titleClassName, artistClassName }: SongLinksProps) => {
  const libraryArtistId = useLibraryStore((state) => (
    song && !song.artistId ? state.tracks.find((track) => track.id === song.id)?.artistId : undefined
  ));
  const candidateId = song?.artistId ?? libraryArtistId;
  const artistId = useLibraryStore((state) => (
    candidateId && state.artists.some((artist) => artist.id === candidateId) ? candidateId : undefined
  ));

  return (
    <>
      <p className={cn("truncate", titleClassName)}>
        {song?.albumId ? (
          <Tooltip content={song.album} side="top" align="start">
            <Link to={`/albums/${song.albumId}`} className={LINK_CLASS}>{song.title}</Link>
          </Tooltip>
        ) : (song?.title ?? fallbackTitle)}
      </p>
      <p className={cn("truncate", artistClassName)}>
        {artistId && song?.artist ? (
          <Link to={`/artists/${artistId}`} className={LINK_CLASS}>{song.artist}</Link>
        ) : (song?.artist ?? fallbackArtist)}
      </p>
    </>
  );
};

interface AlbumCoverLinkProps {
  song?: SubsonicSong | null;
  className?: string;
  children: React.ReactNode;
}

export const AlbumCoverLink = ({ song, className, children }: AlbumCoverLinkProps) => (
  song?.albumId ? (
    <Link
      to={`/albums/${song.albumId}`}
      aria-label={song.album ? `Go to ${song.album}` : "Go to album"}
      className={className}
    >
      {children}
    </Link>
  ) : <div className={className}>{children}</div>
);

export default SongLinks;
