import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import MediaCollection, { MediaSortOption } from "../components/library/MediaCollection";
import { useAlbums, useLibraryStatus } from "../hooks/useLibrary";
import { useAuthStore } from "../store/authStore";
import { useLibraryStore } from "../store/libraryStore";
import { AlbumEntity } from "../types/library";
import { getAlbumCoverUrl } from "../utils/mediaImages";
import { addAlbumToQueue, playAlbum, queueAlbumNext } from "../utils/playbackActions";

const getAlbumYear = (album: AlbumEntity): number | undefined => {
  if (typeof album.year === "number") {
    return album.year;
  }
  if (album.created) {
    const parsed = Number.parseInt(album.created.slice(0, 4), 10);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const AlbumsPage = () => {
  const albums = useAlbums();
  const status = useLibraryStatus();
  const navigate = useNavigate();
  const client = useAuthStore((state) => state.session?.client);
  const libraryError = useLibraryStore((state) => state.error);

  const albumSortOptions = useMemo<MediaSortOption<AlbumEntity>[]>(() => [
    {
      value: "az",
      label: "A-Z",
      compare: (left, right) => left.title.localeCompare(right.title),
    },
    {
      value: "za",
      label: "Z-A",
      compare: (left, right) => right.title.localeCompare(left.title),
    },
    {
      value: "newest",
      label: "Newest",
      compare: (left, right) => {
        const leftYear = getAlbumYear(left);
        const rightYear = getAlbumYear(right);
        const hasLeftYear = typeof leftYear === "number";
        const hasRightYear = typeof rightYear === "number";
        if (hasLeftYear && hasRightYear && leftYear !== rightYear) {
          return (rightYear as number) - (leftYear as number);
        }
        if (hasLeftYear && !hasRightYear) return -1;
        if (!hasLeftYear && hasRightYear) return 1;
        return left.title.localeCompare(right.title);
      },
    },
    {
      value: "oldest",
      label: "Oldest",
      compare: (left, right) => {
        const leftYear = getAlbumYear(left);
        const rightYear = getAlbumYear(right);
        const hasLeftYear = typeof leftYear === "number";
        const hasRightYear = typeof rightYear === "number";
        if (hasLeftYear && hasRightYear && leftYear !== rightYear) {
          return (leftYear as number) - (rightYear as number);
        }
        if (hasLeftYear && !hasRightYear) return -1;
        if (!hasLeftYear && hasRightYear) return 1;
        return left.title.localeCompare(right.title);
      },
    },
  ], []);

  const isLoading = status === "idle" || status === "checking" || status === "indexing";
  const description = useMemo(
    () => isLoading
      ? "Loading your albums..."
      : `${albums.length.toLocaleString()} album${albums.length === 1 ? "" : "s"} in your library.`,
    [albums.length, isLoading],
  );

  const mapAlbumToItem = useCallback((album: AlbumEntity) => {
    const year = getAlbumYear(album);
    const metaParts = [];
    if (year) metaParts.push(String(year));
    if (album.songCount) metaParts.push(`${album.songCount} song${album.songCount === 1 ? "" : "s"}`);

    return {
      id: album.id,
      title: album.title,
      subtitle: album.artistName,
      meta: metaParts.length > 0 ? metaParts.join(" • ") : undefined,
      coverUrl: getAlbumCoverUrl(album, client),
      searchText: [
        album.title,
        album.artistName,
        album.genre,
        year ? String(year) : "",
      ].filter(Boolean).join(" "),
      onPlay: () => {
        void playAlbum(album.id).catch((error) => {
          const errorMessage = error instanceof Error ? error.message : undefined;
          toast.error("Unable to play album", errorMessage ? { description: errorMessage } : undefined);
        });
      },
      onPlayNext: () => {
        void queueAlbumNext(album.id).catch((error) => {
          const errorMessage = error instanceof Error ? error.message : undefined;
          toast.error("Unable to queue album next", errorMessage ? { description: errorMessage } : undefined);
        });
      },
      onAddToQueue: () => {
        void addAlbumToQueue(album.id).catch((error) => {
          const errorMessage = error instanceof Error ? error.message : undefined;
          toast.error("Unable to add album to queue", errorMessage ? { description: errorMessage } : undefined);
        });
      },
      onClick: () => navigate(`/albums/${album.id}`),
    };
  }, [client, navigate]);

  return (
    <MediaCollection
      title="Albums"
      description={description}
      items={albums}
      kind="album"
      mapItem={mapAlbumToItem}
      sortOptions={albumSortOptions}
      defaultSort="az"
      searchPlaceholder="Search"
      isLoading={isLoading}
      error={libraryError}
      emptyMessage="No albums match your search."
    />
  );
};

export default AlbumsPage;
