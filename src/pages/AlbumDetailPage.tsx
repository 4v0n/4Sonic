import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AlbumSongsTable from "../components/library/AlbumSongsTable";
import Button from "../components/ui/Button";
import Spinner from "../components/ui/Spinner";
import { useLibraryStore } from "../store/libraryStore";
import { SubsonicAlbumDetail, SubsonicSong } from "../types/subsonic";
import { playAlbum } from "../utils/playbackActions";


const AlbumDetailPage = () => {
  const { albumId } = useParams<{ albumId: string }>();
  const navigate = useNavigate();
  const status = useLibraryStore((state) => state.status);
  const tracks = useLibraryStore((state) => state.tracks);
  const album = useLibraryStore((state) => state.albums.find((entry) => entry.id === albumId));

  const albumTracks = useMemo(
    () => tracks.filter((track) => track.albumId === albumId).sort((left, right) => {
      const leftDisc = left.discNumber ?? 0;
      const rightDisc = right.discNumber ?? 0;
      if (leftDisc !== rightDisc) return leftDisc - rightDisc;
      const leftTrack = left.trackNumber ?? 0;
      const rightTrack = right.trackNumber ?? 0;
      if (leftTrack !== rightTrack) return leftTrack - rightTrack;
      return left.title.localeCompare(right.title);
    }),
    [albumId, tracks],
  );

  const albumForTable = useMemo<SubsonicAlbumDetail | undefined>(() => {
    if (!album) return undefined;
    const songs: SubsonicSong[] = albumTracks.map((track) => ({
      id: track.id,
      title: track.title,
      album: track.albumName ?? album.title,
      albumId: track.albumId ?? album.id,
      artist: track.artistName ?? album.artistName,
      artistId: track.artistId ?? album.artistId,
      track: track.trackNumber,
      discNumber: track.discNumber,
      duration: track.duration,
      bitDepth: track.bitDepth,
      samplingRate: track.samplingRate,
      year: track.year ?? album.year,
      genre: track.genre ?? album.genre,
      coverArt: track.coverArt ?? album.coverArt,
      suffix: track.suffix,
    }));

    return {
      id: album.id,
      name: album.title,
      artistId: album.artistId,
      artist: album.artistName,
      songCount: album.songCount ?? songs.length,
      duration: album.duration,
      created: album.created,
      year: album.year,
      genre: album.genre,
      coverArt: album.coverArt,
      song: songs,
    };
  }, [album, albumTracks]);

  const playAlbumFromDetail = (startSongId?: string) => {
    if (!albumForTable) {
      throw new Error("Album not available");
    }
    return playAlbum(albumForTable, startSongId ? { startSongId } : undefined);
  };

  if (!albumId) {
    return (
      <div className="space-y-4">
        <p className="text-lg font-semibold text-(--text)">Album not found</p>
        <Button variant="secondary" onClick={() => navigate(-1)}>Go back</Button>
      </div>
    );
  }

  if (!album) {
    if (status === "indexing" || status === "checking") {
      return (
        <div className="flex h-full items-center justify-center">
          <Spinner size="md" />
        </div>
      );
    }
    return (
      <div className="space-y-4">
        <p className="text-lg font-semibold text-(--text)">Album not found</p>
        <Button variant="secondary" onClick={() => navigate("/albums")}>Back to albums</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AlbumSongsTable
        album={albumForTable}
        onSongClick={(song) => playAlbumFromDetail(song.id)}
      />
    </div>
  );
};

export default AlbumDetailPage;
