import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AlbumSongsTable from "../components/library/AlbumSongsTable";
import Button from "../components/ui/Button";
import Spinner from "../components/ui/Spinner";
import { useLibraryStore } from "../store/libraryStore";
import { SubsonicAlbumDetail } from "../types/subsonic";
import { playAlbum } from "../utils/playbackActions";
import { trackToSong } from "../utils/playbackMapping";
import { sortSongsForQueue } from "../utils/playbackSort";


const AlbumDetailPage = () => {
  const { albumId } = useParams<{ albumId: string }>();
  const navigate = useNavigate();
  const status = useLibraryStore((state) => state.status);
  const tracks = useLibraryStore((state) => state.tracks);
  const album = useLibraryStore((state) => state.albums.find((entry) => entry.id === albumId));

  const albumTracks = useMemo(
    () => tracks.filter((track) => track.albumId === albumId),
    [albumId, tracks],
  );

  const albumForTable = useMemo<SubsonicAlbumDetail | undefined>(() => {
    if (!album) return undefined;
    const songs = sortSongsForQueue(albumTracks.map((track) => {
      const base = trackToSong(track);
      return {
        ...base,
        album: base.album ?? album.title,
        albumId: base.albumId ?? album.id,
        artist: base.artist ?? album.artistName,
        artistId: base.artistId ?? album.artistId,
        year: base.year ?? album.year,
        genre: base.genre ?? album.genre,
        coverArt: base.coverArt ?? album.coverArt,
      };
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
