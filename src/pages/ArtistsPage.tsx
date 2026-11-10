import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import MediaCollection, { MediaSortOption } from "../components/library/MediaCollection";
import { getArtistActions } from "../components/media/actions";
import ArtistRow from "../components/media/ArtistRow";
import ArtistTile from "../components/media/ArtistTile";
import { useArtists, useLibraryStatus } from "../hooks/useLibrary";
import { useAuthStore } from "../store/authStore";
import { useLibraryStore } from "../store/libraryStore";
import { ArtistEntity } from "../types/library";
import { getArtistImageUrl } from "../utils/mediaImages";

const getArtistKey = (artist: ArtistEntity) => artist.id;
const getArtistSearchText = (artist: ArtistEntity) => [artist.name, String(artist.albumCount ?? "")].filter(Boolean).join(" ");

const ArtistsPage = () => {
  const artists = useArtists();
  const status = useLibraryStatus();
  const navigate = useNavigate();
  const client = useAuthStore((state) => state.session?.client);
  const libraryError = useLibraryStore((state) => state.error);

  const sortOptions = useMemo<MediaSortOption<ArtistEntity>[]>(() => [
    {
      value: "az",
      label: "A-Z",
      compare: (left, right) => left.name.localeCompare(right.name),
    },
    {
      value: "za",
      label: "Z-A",
      compare: (left, right) => right.name.localeCompare(left.name),
    },
    {
      value: "most-albums",
      label: "Most albums",
      compare: (left, right) => {
        const diff = right.albumCount - left.albumCount;
        return diff !== 0 ? diff : left.name.localeCompare(right.name);
      },
    },
    {
      value: "fewest-albums",
      label: "Fewest albums",
      compare: (left, right) => {
        const diff = left.albumCount - right.albumCount;
        return diff !== 0 ? diff : left.name.localeCompare(right.name);
      },
    },
  ], []);

  const isLoading = status === "idle" || status === "checking" || status === "indexing";
  const description = useMemo(
    () => isLoading
      ? "Loading your artists..."
      : `${artists.length.toLocaleString()} artist${artists.length === 1 ? "" : "s"} in your library.`,
    [artists.length, isLoading],
  );

  const getArtistProps = useCallback((artist: ArtistEntity) => ({
    name: artist.name,
    albumCount: artist.albumCount,
    coverUrl: getArtistImageUrl(artist, client),
    actions: getArtistActions(artist.id),
    onClick: () => navigate(`/artists/${artist.id}`),
  }), [client, navigate]);

  const renderTile = useCallback(
    (artist: ArtistEntity) => <ArtistTile {...getArtistProps(artist)} className="w-full max-w-full" />,
    [getArtistProps],
  );
  const renderRow = useCallback(
    (artist: ArtistEntity) => <ArtistRow {...getArtistProps(artist)} className="w-full" />,
    [getArtistProps],
  );

  return (
    <MediaCollection
      title="Artists"
      description={description}
      items={artists}
      getKey={getArtistKey}
      getSearchText={getArtistSearchText}
      renderTile={renderTile}
      renderRow={renderRow}
      sortOptions={sortOptions}
      defaultSort="az"
      searchPlaceholder="Search..."
      isLoading={isLoading}
      error={libraryError}
      emptyMessage="No artists match your search."
    />
  );
};

export default ArtistsPage;
