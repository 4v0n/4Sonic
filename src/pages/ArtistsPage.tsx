import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import MediaCollection, { MediaSortOption } from "../components/library/MediaCollection";
import { useArtists, useLibraryStatus } from "../hooks/useLibrary";
import { useAuthStore } from "../store/authStore";
import { useLibraryStore } from "../store/libraryStore";
import { ArtistEntity } from "../types/library";
import { getArtistImageUrl } from "../utils/mediaImages";
import { addArtistToQueue, playArtist, queueArtistNext } from "../utils/playbackActions";

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

  const mapArtistToItem = useCallback((artist: ArtistEntity) => {
    const albumLabel = artist.albumCount === 1 ? "album" : "albums";
    return {
      id: artist.id,
      title: artist.name,
      subtitle: artist.albumCount ? `${artist.albumCount} ${albumLabel}` : undefined,
      coverUrl: getArtistImageUrl(artist, client),
      searchText: [artist.name, String(artist.albumCount ?? "")].filter(Boolean).join(" "),
      onPlay: () => {
        void playArtist(artist.id).catch((error) => {
          const errorMessage = error instanceof Error ? error.message : undefined;
          toast.error("Unable to play artist", errorMessage ? { description: errorMessage } : undefined);
        });
      },
      onPlayNext: () => {
        void queueArtistNext(artist.id).catch((error) => {
          const errorMessage = error instanceof Error ? error.message : undefined;
          toast.error("Unable to queue artist next", errorMessage ? { description: errorMessage } : undefined);
        });
      },
      onAddToQueue: () => {
        void addArtistToQueue(artist.id).catch((error) => {
          const errorMessage = error instanceof Error ? error.message : undefined;
          toast.error("Unable to add artist to queue", errorMessage ? { description: errorMessage } : undefined);
        });
      },
      onClick: () => navigate(`/artists/${artist.id}`),
    };
  }, [client, navigate]);

  return (
    <MediaCollection
      title="Artists"
      description={description}
      items={artists}
      kind="artist"
      mapItem={mapArtistToItem}
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
