import { useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import MediaCollection, { MediaSortOption } from "../components/library/MediaCollection";
import Button from "../components/ui/Button";
import Spinner from "../components/ui/Spinner";
import CoverImage from "../components/ui/CoverImage";
import { PlayArrowIcon } from "../constants/icons";
import { useAuthStore } from "../store/authStore";
import { useLibraryStore } from "../store/libraryStore";
import { AlbumEntity } from "../types/library";
import { addAlbumToQueue, addArtistToQueue, playAlbum, playArtist, queueAlbumNext, queueArtistNext } from "../utils/playbackActions";
import { getAlbumCoverUrl, getArtistImageUrl } from "../utils/mediaImages";

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

const ArtistDetailPage = () => {
  const { artistId } = useParams<{ artistId: string }>();
  const navigate = useNavigate();
  const client = useAuthStore((state) => state.session?.client);
  const status = useLibraryStore((state) => state.status);
  const artists = useLibraryStore((state) => state.artists);
  const albums = useLibraryStore((state) => state.albums);

  const artist = useMemo(
    () => artists.find((entry) => entry.id === artistId),
    [artistId, artists],
  );

  const artistAlbums = useMemo(() => {
    if (!artist || !artistId) {
      return [];
    }
    return albums.filter((album) => {
      if (album.artistId === artistId) {
        return true;
      }
      if (!album.artistId) {
        return album.artistName === artist.name;
      }
      return false;
    });
  }, [albums, artist, artistId]);

  const artistCover = useMemo(
    () => getArtistImageUrl(artist, client),
    [artist, client],
  );

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
          const description = error instanceof Error ? error.message : undefined;
          toast.error("Unable to play album", description ? { description } : undefined);
        });
      },
      onPlayNext: () => {
        void queueAlbumNext(album.id).catch((error) => {
          const description = error instanceof Error ? error.message : undefined;
          toast.error("Unable to queue album next", description ? { description } : undefined);
        });
      },
      onAddToQueue: () => {
        void addAlbumToQueue(album.id).catch((error) => {
          const description = error instanceof Error ? error.message : undefined;
          toast.error("Unable to add album to queue", description ? { description } : undefined);
        });
      },
      onClick: () => navigate(`/albums/${album.id}`),
    };
  }, [client, navigate]);

  if (!artistId) {
    return (
      <div className="space-y-4">
        <p className="text-lg font-semibold text-(--text)">Artist not found</p>
        <Button variant="secondary" onClick={() => navigate("/artists")}>Back to artists</Button>
      </div>
    );
  }

  if (!artist) {
    if (status === "checking" || status === "indexing") {
      return (
        <div className="flex h-full items-center justify-center">
          <Spinner size="md" />
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <p className="text-lg font-semibold text-(--text)">Artist not found</p>
        <Button variant="secondary" onClick={() => navigate("/artists")}>Back to artists</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-5 rounded-2xl border border-(--surface2) bg-(--surface1) p-4 sm:flex-row sm:items-center">
        <div className="h-28 w-28 overflow-hidden rounded-xl border border-(--surface2) bg-(--surface0) sm:h-32 sm:w-32">
          <CoverImage
            src={artistCover}
            alt={artist.name}
            className="h-full w-full"
            placeholder={<div className="h-full w-full bg-(--surface2)" />}
            fallback={<div className="h-full w-full bg-(--surface2)" />}
          />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-(--text-grey)">Artist</p>
          <h1 className="truncate text-3xl font-extrabold text-(--text)">{artist.name}</h1>
          <p className="text-sm text-(--text-grey)">
            {artistAlbums.length.toLocaleString()} album{artistAlbums.length === 1 ? "" : "s"}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="primary"
              className="shadow-none"
              onClick={() => {
                void playArtist(artist.id).catch((error) => {
                  const description = error instanceof Error ? error.message : undefined;
                  toast.error("Unable to play artist", description ? { description } : undefined);
                });
              }}
            >
              <PlayArrowIcon />
              <span>Play</span>
            </Button>
            <Button
              variant="secondary"
              className="shadow-none"
              onClick={() => {
                void queueArtistNext(artist.id).catch((error) => {
                  const description = error instanceof Error ? error.message : undefined;
                  toast.error("Unable to queue artist next", description ? { description } : undefined);
                });
              }}
            >
              Play next
            </Button>
            <Button
              variant="secondary"
              className="shadow-none"
              onClick={() => {
                void addArtistToQueue(artist.id).catch((error) => {
                  const description = error instanceof Error ? error.message : undefined;
                  toast.error("Unable to add artist to queue", description ? { description } : undefined);
                });
              }}
            >
              Add to queue
            </Button>
          </div>
        </div>
      </section>

      <MediaCollection
        title="Albums"
        description={`${artistAlbums.length.toLocaleString()} album${artistAlbums.length === 1 ? "" : "s"}`}
        items={artistAlbums}
        kind="album"
        mapItem={mapAlbumToItem}
        sortOptions={albumSortOptions}
        defaultSort="az"
        searchPlaceholder="Search albums..."
        isLoading={status === "idle" || status === "checking" || status === "indexing"}
        emptyMessage={`No albums found for ${artist.name}.`}
      />
    </div>
  );
};

export default ArtistDetailPage;
