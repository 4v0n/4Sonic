import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import MediaCollection, { MediaSortOption } from "../components/library/MediaCollection";
import { getAlbumActions } from "../components/media/actions";
import AlbumRow from "../components/media/AlbumRow";
import AlbumTile from "../components/media/AlbumTile";
import { useAlbums, useLibraryStatus } from "../hooks/useLibrary";
import { useAuthStore } from "../store/authStore";
import { useLibraryStore } from "../store/libraryStore";
import { AlbumEntity } from "../types/library";
import { getAlbumCoverUrl } from "../utils/mediaImages";

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

const getAlbumKey = (album: AlbumEntity) => album.id;
const getAlbumSearchText = (album: AlbumEntity) => {
  const year = getAlbumYear(album);
  return [album.title, album.artistName, album.genre, year ? String(year) : ""].filter(Boolean).join(" ");
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

  const getAlbumProps = useCallback((album: AlbumEntity) => ({
    title: album.title,
    artistName: album.artistName,
    year: getAlbumYear(album),
    songCount: album.songCount,
    coverUrl: getAlbumCoverUrl(album, client),
    actions: getAlbumActions(album.id),
    onClick: () => navigate(`/albums/${album.id}`),
  }), [client, navigate]);

  const renderTile = useCallback(
    (album: AlbumEntity) => <AlbumTile {...getAlbumProps(album)} className="w-full max-w-full" />,
    [getAlbumProps],
  );
  const renderRow = useCallback(
    (album: AlbumEntity) => <AlbumRow {...getAlbumProps(album)} className="w-full" />,
    [getAlbumProps],
  );

  return (
    <MediaCollection
      title="Albums"
      description={description}
      items={albums}
      getKey={getAlbumKey}
      getSearchText={getAlbumSearchText}
      renderTile={renderTile}
      renderRow={renderRow}
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
