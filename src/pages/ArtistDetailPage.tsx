import React, { useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ArtistHero from "../components/artist/ArtistHero";
import ArtistTabBar, { type ArtistTab } from "../components/artist/ArtistTabBar";
import MediaCollection, { type MediaSortOption, type ViewMode } from "../components/library/MediaCollection";
import { getAlbumActions, getArtistActions } from "../components/media/actions";
import AlbumRow from "../components/media/AlbumRow";
import { formatCount } from "../components/media/format";
import AlbumTile from "../components/media/AlbumTile";
import { MetaList } from "../components/media/CollectionLayout";
import Button from "../components/ui/Button";
import Select from "../components/ui/Select";
import Spinner from "../components/ui/Spinner";
import { ToggleGroup, ToggleGroupItem } from "../components/ui/ToggleGroup";
import { GridViewIcon, ListViewIcon } from "../constants/icons";
import useHistoryEntryState from "../hooks/useHistoryEntryState";
import useImageAccentColor from "../hooks/useImageAccentColor";
import { useAuthStore } from "../store/authStore";
import { useCollectionPreference } from "../store/collectionPreferencesStore";
import { useLibraryStore } from "../store/libraryStore";
import type { AlbumEntity } from "../types/library";
import { accentThemeVars } from "../utils/imageColor";
import { getAlbumCoverUrl, getArtistImageUrl } from "../utils/mediaImages";

type ReleaseTab = "albums" | "singles" | "compilations";
type ArtistTabValue = "all" | ReleaseTab;

const HERO_IMAGE_SIZE = 1200;

const getAlbumYear = (album: AlbumEntity): number | undefined => {
  if (typeof album.year === "number") return album.year;
  if (album.releaseDate?.year) return album.releaseDate.year;
  if (album.created) {
    const parsed = Number.parseInt(album.created.slice(0, 4), 10);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const getReleaseKey = (album: AlbumEntity): number | undefined => {
  const year = getAlbumYear(album);
  if (year === undefined) return undefined;
  const date = album.releaseDate?.year === year ? album.releaseDate : undefined;
  return year * 10000 + (date?.month ?? 0) * 100 + (date?.day ?? 0);
};

const byTitle = (left: AlbumEntity, right: AlbumEntity) => left.title.localeCompare(right.title);

const byDate = (direction: 1 | -1) => (left: AlbumEntity, right: AlbumEntity) => {
  const leftKey = getReleaseKey(left);
  const rightKey = getReleaseKey(right);
  if (leftKey === undefined || rightKey === undefined) {
    return (leftKey === undefined ? 1 : 0) - (rightKey === undefined ? 1 : 0) || byTitle(left, right);
  }
  return direction * (leftKey - rightKey) || byTitle(left, right);
};

const SORT_OPTIONS: MediaSortOption<AlbumEntity>[] = [
  { value: "newest", label: "Newest", compare: byDate(-1) },
  { value: "oldest", label: "Oldest", compare: byDate(1) },
  { value: "az", label: "A-Z", compare: byTitle },
  { value: "za", label: "Z-A", compare: (left, right) => byTitle(right, left) },
  { value: "songs", label: "Most songs", compare: (left, right) => (right.songCount ?? 0) - (left.songCount ?? 0) || byTitle(left, right) },
];

const getReleaseTab = (album: AlbumEntity): ReleaseTab => {
  const types = (album.releaseTypes ?? []).map((type) => type.toLowerCase());
  if (album.isCompilation || types.includes("compilation")) return "compilations";
  if (types.includes("single") || types.includes("ep")) return "singles";
  return "albums";
};

const RELEASE_TABS: ArtistTab<ReleaseTab>[] = [
  { value: "albums", label: "Albums" },
  { value: "singles", label: "Singles and EPs" },
  { value: "compilations", label: "Compilations" },
];

const EMPTY_MESSAGES: Record<ArtistTabValue, string> = {
  all: "No releases found.",
  albums: "No albums found.",
  singles: "No singles or EPs.",
  compilations: "No compilations.",
};

const getAlbumKey = (album: AlbumEntity) => album.id;
const getAlbumSearchText = (album: AlbumEntity) =>
  [album.title, getAlbumYear(album), album.genre, ...(album.genres ?? [])].filter(Boolean).join(" ");


const ArtistDetailPage = () => {
  const { artistId } = useParams<{ artistId: string }>();
  const navigate = useNavigate();
  const client = useAuthStore((state) => state.session?.client);
  const status = useLibraryStore((state) => state.status);
  const artist = useLibraryStore((state) => state.artists.find((entry) => entry.id === artistId));
  const albums = useLibraryStore((state) => state.albums);
  const tracks = useLibraryStore((state) => state.tracks);
  const [tab, setTab] = useHistoryEntryState<ArtistTabValue | undefined>("artist-detail:tab", undefined);
  const [viewMode, setViewMode] = useCollectionPreference("artist-detail", "view", "grid");
  const [sortValue, setSortValue] = useCollectionPreference("artist-detail", "sort", "newest");

  const artistAlbums = useMemo(() => {
    if (!artist) return [];
    return albums
      .filter((album) => album.artistId === artist.id || (!album.artistId && album.artistName === artist.name));
  }, [albums, artist]);

  const releases = useMemo(() => {
    const grouped: Record<ReleaseTab, AlbumEntity[]> = { albums: [], singles: [], compilations: [] };
    artistAlbums.forEach((album) => grouped[getReleaseTab(album)].push(album));
    return grouped;
  }, [artistAlbums]);

  const songCount = useMemo(
    () => (artist ? tracks.filter((track) => track.artistId === artist.id).length : 0),
    [artist, tracks],
  );

  const heroImageUrl = useMemo(() => getArtistImageUrl(artist, client, HERO_IMAGE_SIZE), [artist, client]);
  const accentColor = useImageAccentColor(heroImageUrl);
  const artistActions = useMemo(() => (artist ? getArtistActions(artist.id) : undefined), [artist]);

  const tabs = useMemo<ArtistTab<ArtistTabValue>[]>(() => {
    const available = RELEASE_TABS.filter((entry) => releases[entry.value].length > 0);
    const all: ArtistTab<ArtistTabValue> = { value: "all", label: "Releases" };
    return available.length > 1 ? [all, ...available] : [all];
  }, [releases]);

  const activeTab = tabs.find((entry) => entry.value === tab)?.value ?? tabs[0].value;
  const visibleReleases = activeTab === "all" ? artistAlbums : releases[activeTab];

  const openAlbum = useCallback((albumId: string) => navigate(`/albums/${albumId}`), [navigate]);

  const renderTile = useCallback((album: AlbumEntity) => (
    <AlbumTile
      title={album.title}
      year={getAlbumYear(album)}
      songCount={album.songCount}
      coverUrl={getAlbumCoverUrl(album, client)}
      actions={getAlbumActions(album.id)}
      onClick={() => openAlbum(album.id)}
      showArtist={false}
      className="w-full max-w-full"
    />
  ), [client, openAlbum]);

  const renderRow = useCallback((album: AlbumEntity) => (
    <AlbumRow
      title={album.title}
      coverUrl={getAlbumCoverUrl(album, client)}
      year={getAlbumYear(album)}
      songCount={album.songCount}
      duration={album.duration}
      actions={getAlbumActions(album.id)}
      onClick={() => openAlbum(album.id)}
      showArtist={false}
    />
  ), [client, openAlbum]);

  if (!artist) {
    if (status === "idle" || status === "checking" || status === "indexing") {
      return (
        <div className="flex h-full items-center justify-center">
          <Spinner size="md" />
        </div>
      );
    }
    return (
      <div className="space-y-4">
        <p className="text-lg font-semibold text-text">Artist not found</p>
        <Button variant="secondary" onClick={() => navigate("/artists")}>Back to artists</Button>
      </div>
    );
  }

  const listControls = (
    <div className="flex items-center gap-2">
      <Select
        size="small"
        options={SORT_OPTIONS.map(({ value, label }) => ({ value, label }))}
        value={sortValue}
        onValueChange={setSortValue}
      />
      <ToggleGroup
        type="single"
        value={viewMode}
        onValueChange={(value) => {
          if (value) setViewMode(value as ViewMode);
        }}
        aria-label="Change layout"
      >
        <ToggleGroupItem value="grid" aria-label="Grid view">
          <GridViewIcon className="h-5 w-5" />
        </ToggleGroupItem>
        <ToggleGroupItem value="list" aria-label="List view">
          <ListViewIcon className="h-5 w-5" />
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );

  return (
    <div
      className="@container relative isolate -mx-4 -mt-4 sm:-mx-6 sm:-mt-6"
      style={accentColor ? (accentThemeVars(accentColor) as React.CSSProperties) : undefined}
    >
      <ArtistHero
        name={artist.name}
        imageUrl={heroImageUrl}
        color={accentColor}
        meta={<MetaList items={[formatCount(artistAlbums.length, "release"), songCount ? formatCount(songCount, "song") : null]} />}
        {...artistActions}
      />

      <ArtistTabBar tabs={tabs} value={activeTab} onChange={setTab} trailing={listControls} />

      <div className="px-4 py-8 sm:px-9">
        <MediaCollection
          title={artist.name}
          hideHeading
          hideControls
          viewMode={viewMode}
          sortValue={sortValue}
          stateKey="artist-detail"
          items={visibleReleases}
          getKey={getAlbumKey}
          getSearchText={getAlbumSearchText}
          renderTile={renderTile}
          renderRow={renderRow}
          sortOptions={SORT_OPTIONS}
          defaultSort="newest"
          isLoading={status === "idle" || status === "checking" || status === "indexing"}
          emptyMessage={EMPTY_MESSAGES[activeTab]}
        />
      </div>
    </div>
  );
};

export default ArtistDetailPage;
