import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";
import LazyImage from "../components/ui/LazyImage";
import Spinner from "../components/ui/Spinner";
import { PlayArrowIcon } from "../constants/icons";
import { QueueItem, usePlaybackStore } from "../store/playbackStore";
import { useAuthStore } from "../store/authStore";
import { useLibraryStore } from "../store/libraryStore";

const formatTrackDuration = (seconds?: number): string => {
  if (!Number.isFinite(seconds) || !seconds) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const formatAlbumDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const parts = [];
  if (hours > 0) parts.push(`${hours} hr${hours === 1 ? "" : "s"}`);
  parts.push(`${mins} min${mins === 1 ? "" : "s"}`);
  return parts.join(" ");
};

const AlbumDetailPage = () => {
  const { albumId } = useParams<{ albumId: string }>();
  const navigate = useNavigate();
  const setQueue = usePlaybackStore((state) => state.setQueue);
  const currentSongId = usePlaybackStore((state) => state.currentSong?.id);
  const status = useLibraryStore((state) => state.status);
  const tracks = useLibraryStore((state) => state.tracks);
  const album = useLibraryStore((state) => state.albums.find((entry) => entry.id === albumId));
  const client = useAuthStore((state) => state.session?.client);

  const albumCoverUrl = album?.coverArt ? client?.getCoverArtUrl(album.coverArt, { size: 512 }) : undefined;

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

  const totalDurationSeconds = useMemo(
    () => albumTracks.reduce((sum, track) => sum + (track.duration ?? 0), 0),
    [albumTracks],
  );

  const queueItems = useMemo<QueueItem[]>(
    () => albumTracks.map((track) => ({
      id: track.id,
      title: track.title,
      artist: track.artistName ?? album?.artistName,
      album: track.albumName ?? album?.title,
      albumId: track.albumId,
      duration: track.duration,
      coverArt: track.coverArt ?? album?.coverArt,
      coverArtUrl: track.coverArt ? client?.getCoverArtUrl(track.coverArt, { size: 512 }) : albumCoverUrl,
      trackNumber: track.trackNumber,
    })),
    [albumTracks, album, albumCoverUrl, client],
  );

  const handlePlayAlbum = () => {
    if (queueItems.length === 0) return;
    void setQueue(queueItems, 0);
  };

  const handlePlayTrack = (index: number) => {
    if (queueItems.length === 0) return;
    void setQueue(queueItems, index);
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

  const subtitleParts = [
    album.artistName,
    album.year ? String(album.year) : null,
    album.songCount ? `${album.songCount} song${album.songCount === 1 ? "" : "s"}` : `${albumTracks.length} songs`,
    totalDurationSeconds > 0 ? formatAlbumDuration(totalDurationSeconds) : null,
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-6 md:flex-row md:items-center">
        <div className="h-48 w-48 overflow-hidden rounded-2xl border border-(--surface2) bg-(--surface1) shadow">
          {albumCoverUrl ? (
            <LazyImage
              src={albumCoverUrl}
              alt={album.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-(--surface2)" />
          )}
        </div>
        <div className="flex-1 space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-(--text-grey)">Album</p>
          <h1 className="text-4xl font-extrabold leading-tight text-(--text)">{album.title}</h1>
          <p className="text-base text-(--text-grey)">{subtitleParts.join(" • ")}</p>
          <Button
            size="large"
            variant="primary"
            className="px-4"
            onClick={handlePlayAlbum}
            aria-label="Play album"
          >
            <PlayArrowIcon />
            Play
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-(--surface2) bg-(--surface0)">
        <div className="grid grid-cols-[64px,1fr,120px] items-center px-4 py-3 text-xs font-semibold uppercase tracking-wide text-(--text-grey)">
          <span className="text-left">#</span>
          <span>Title</span>
          <span className="text-right">Duration</span>
        </div>
        <div className="divide-y divide-(--surface2)">
          {albumTracks.map((track, index) => {
            const isActive = currentSongId === track.id;
            return (
              <button
                key={track.id}
                className={`grid w-full grid-cols-[64px,1fr,120px] items-center px-4 py-3 text-left transition ${
                  isActive ? "bg-(--surface2)" : "hover:bg-(--surface1)"
                }`}
                onClick={() => handlePlayTrack(index)}
              >
                <span className="text-sm text-(--text-grey)">{track.trackNumber ?? index + 1}</span>
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 overflow-hidden rounded-lg border border-(--surface2) bg-(--surface1)">
                    {albumCoverUrl ? (
                      <LazyImage
                        src={albumCoverUrl}
                        alt={track.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full bg-(--surface2)" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-(--text)">{track.title}</p>
                    <p className="truncate text-xs text-(--text-grey)">{track.artistName ?? album.artistName}</p>
                  </div>
                </div>
                <span className="text-right text-sm tabular-nums text-(--text-grey)">{formatTrackDuration(track.duration)}</span>
              </button>
            );
          })}
          {albumTracks.length === 0 ? (
            <div className="px-4 py-6 text-sm text-(--text-grey)">No tracks available for this album.</div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default AlbumDetailPage;
