import { useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import CollectionActionBar from "../components/media/CollectionActionBar";
import {
  ArtistList,
  CollectionDetails,
  CollectionTags,
  formatReleaseTypes,
  type CollectionArtist,
} from "../components/media/CollectionAside";
import CollectionLayout, { MetaList } from "../components/media/CollectionLayout";
import TrackList from "../components/media/TrackList";
import Button from "../components/ui/Button";
import Spinner from "../components/ui/Spinner";
import { PersonIcon } from "../constants/icons";
import useHistoryEntryState from "../hooks/useHistoryEntryState";
import useImageAccentColor from "../hooks/useImageAccentColor";
import { useAuthStore } from "../store/authStore";
import { useLibraryStore } from "../store/libraryStore";
import { usePlaybackStore } from "../store/playbackStore";
import type { LibraryDate } from "../types/library";
import type { SubsonicAlbumDetail, SubsonicSong } from "../types/subsonic";
import { formatCollectionQuality } from "../utils/audioQuality";
import { getAlbumCoverUrl, getArtistImageUrl } from "../utils/mediaImages";
import { addAlbumToQueue, playAlbum, queueAlbumNext } from "../utils/playbackActions";
import { trackToSong } from "../utils/playbackMapping";
import { sortSongsForQueue } from "../utils/playbackSort";
import { includesNormalized } from "../utils/strings";
import { formatTotalDuration } from "../utils/time";

const GENRE_SEPARATOR = /\s*[;,/]\s*/;

const formatReleaseDate = (date?: LibraryDate) => {
  if (!date?.year) return undefined;
  if (!date.month) return String(date.year);
  return new Date(date.year, date.month - 1, date.day ?? 1).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    ...(date.day ? { day: "numeric" } : {}),
  });
};

const withErrorToast = (action: () => Promise<unknown>, message: string) => () => {
  void action().catch((error) => {
    const description = error instanceof Error ? error.message : undefined;
    toast.error(message, description ? { description } : undefined);
  });
};

const AlbumDetailPage = () => {
  const { albumId } = useParams<{ albumId: string }>();
  const navigate = useNavigate();
  const client = useAuthStore((state) => state.session?.client);
  const status = useLibraryStore((state) => state.status);
  const tracks = useLibraryStore((state) => state.tracks);
  const artists = useLibraryStore((state) => state.artists);
  const album = useLibraryStore((state) => state.albums.find((entry) => entry.id === albumId));
  const [searchQuery, setSearchQuery] = useHistoryEntryState("album-detail:search", "");

  const albumTracks = useMemo(
    () => tracks.filter((track) => track.albumId === albumId),
    [albumId, tracks],
  );

  const albumDetail = useMemo<SubsonicAlbumDetail | undefined>(() => {
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

  const songs = useMemo(() => albumDetail?.song ?? [], [albumDetail]);
  const coverUrl = useMemo(() => getAlbumCoverUrl(album, client), [album, client]);
  const accentColor = useImageAccentColor(coverUrl);

  const visibleSongs = useMemo(
    () => (searchQuery
      ? songs.filter((song) => includesNormalized(`${song.title} ${song.artist ?? ""}`, searchQuery))
      : songs),
    [searchQuery, songs],
  );

  const totalDuration = useMemo(
    () => album?.duration ?? songs.reduce((sum, song) => sum + (song.duration ?? 0), 0),
    [album?.duration, songs],
  );

  const genres = useMemo(() => {
    const values = album?.genres ?? [album?.genre, ...songs.map((song) => song.genre)]
      .flatMap((genre) => genre?.split(GENRE_SEPARATOR) ?? [])
      .filter(Boolean);
    return Array.from(new Set(values));
  }, [album?.genre, album?.genres, songs]);

  const releaseTypes = useMemo(
    () => formatReleaseTypes(album?.releaseTypes, album?.isCompilation),
    [album?.isCompilation, album?.releaseTypes],
  );

  const quality = useMemo(() => formatCollectionQuality(songs), [songs]);

  const albumArtists = useMemo<CollectionArtist[]>(() => {
    if (!album) return [];
    const byId = new Map(artists.map((artist) => [artist.id, artist]));
    const seen = new Set<string>();
    const result: CollectionArtist[] = [];
    const add = (id: string | undefined, name: string | undefined) => {
      if (!name) return;
      const key = id ?? name;
      if (seen.has(key)) return;
      seen.add(key);
      const entity = id ? byId.get(id) : undefined;
      result.push({
        key,
        name: entity?.name ?? name,
        imageUrl: getArtistImageUrl(entity, client),
        onClick: entity ? () => navigate(`/artists/${entity.id}`) : undefined,
      });
    };
    add(album.artistId, album.artistName);
    songs.forEach((song) => add(song.artistId, song.artist));
    return result;
  }, [album, artists, client, navigate, songs]);

  const playFromSong = useCallback((song: SubsonicSong) => {
    if (!albumDetail) throw new Error("Album not available");
    return playAlbum(albumDetail, { startSongId: song.id });
  }, [albumDetail]);

  const shuffle = usePlaybackStore((state) => state.shuffle);
  const toggleShuffle = usePlaybackStore((state) => state.toggleShuffle);

  const actions = useMemo(() => {
    if (!albumDetail) return undefined;
    return {
      onPlay: withErrorToast(() => {
        const start = usePlaybackStore.getState().shuffle
          ? songs[Math.floor(Math.random() * songs.length)]
          : undefined;
        return playAlbum(albumDetail, start ? { startSongId: start.id } : undefined);
      }, "Unable to play album"),
      onPlayNext: withErrorToast(() => queueAlbumNext(albumDetail), "Unable to queue album next"),
      onAddToQueue: withErrorToast(() => addAlbumToQueue(albumDetail), "Unable to add album to queue"),
    };
  }, [albumDetail, songs]);

  if (!album || !albumDetail) {
    if (albumId && (status === "idle" || status === "indexing" || status === "checking")) {
      return (
        <div className="flex h-full items-center justify-center">
          <Spinner size="md" />
        </div>
      );
    }
    return (
      <div className="space-y-4">
        <p className="text-lg font-semibold text-text">Album not found</p>
        <Button variant="secondary" onClick={() => navigate("/albums")}>Back to albums</Button>
      </div>
    );
  }

  const artistEntity = artists.find((artist) => artist.id === album.artistId);
  const songCount = album.songCount ?? songs.length;

  return (
    <CollectionLayout
      title={album.title}
      coverUrl={coverUrl}
      accentColor={accentColor}
      meta={(
        <MetaList
          items={[
            album.artistName ? (
              artistEntity ? (
                <button
                  type="button"
                  className="flex cursor-pointer items-center gap-1 font-semibold text-text hover:underline"
                  onClick={() => navigate(`/artists/${artistEntity.id}`)}
                >
                  <PersonIcon fontSize="inherit" />
                  {album.artistName}
                </button>
              ) : (
                <span className="flex items-center gap-1 font-semibold text-text">
                  <PersonIcon fontSize="inherit" />
                  {album.artistName}
                </span>
              )
            ) : null,
            album.releaseDate?.year ?? album.year,
            songCount ? `${songCount} song${songCount === 1 ? "" : "s"}` : null,
            totalDuration ? formatTotalDuration(totalDuration) : null,
          ]}
        />
      )}
      actionBar={(
        <CollectionActionBar
          title={album.title}
          {...actions}
          shuffleActive={shuffle}
          onShuffle={toggleShuffle}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search in album"
        />
      )}
      aside={(
        <>
          <CollectionTags tags={Array.from(new Set([...releaseTypes, ...genres]))} />
          <ArtistList artists={albumArtists} />
          <CollectionDetails
            lines={[
              quality,
              formatReleaseDate(album.releaseDate),
            ]}
          />
        </>
      )}
    >
      <TrackList
        songs={visibleSongs}
        onPlay={playFromSong}
        groupByDisc={!searchQuery}
        emptyMessage={searchQuery ? `No songs match "${searchQuery}".` : "This album has no songs."}
      />
    </CollectionLayout>
  );
};

export default AlbumDetailPage;
