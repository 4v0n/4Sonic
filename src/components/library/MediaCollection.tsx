import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GridViewIcon, ListViewIcon } from "../../constants/icons";
import MediaCard, { MediaCardProps } from "../ui/MediaCard";
import SearchInput from "../ui/SearchInput";
import Select from "../ui/Select";
import { ToggleGroup, ToggleGroupItem } from "../ui/ToggleGroup";
import Spinner from "../ui/Spinner";

type ViewMode = "grid" | "list";

export type MediaCollectionItem<T = unknown> = {
  id: string;
  title: string;
  subtitle?: string;
  meta?: string;
  coverUrl?: string;
  onPlay?: () => void;
  onPlayNext?: () => void;
  onAddToQueue?: () => void;
  onClick?: () => void;
  searchText?: string;
  data?: T;
};

export type MediaSortOption<T> = {
  value: string;
  label: string;
  compare: (left: T, right: T) => number;
};

interface MediaCollectionProps<T> {
  title: string;
  description?: string;
  items: T[];
  kind: MediaCardProps["kind"];
  mapItem: (item: T) => MediaCollectionItem<T>;
  sortOptions: MediaSortOption<T>[];
  defaultSort?: string;
  searchPlaceholder?: string;
  isLoading?: boolean;
  error?: string;
  emptyMessage?: string;
}

const DEFAULT_EMPTY_MESSAGE = "Nothing matches your filters yet.";
const GRID_PAGE_SIZE = 24;
const LIST_PAGE_SIZE = 18;
const GRID_CARD_MIN_WIDTH = 180;
const GRID_ROW_HEIGHT = 260;
const LIST_ROW_HEIGHT = 96;
const INTERSECTION_ROOT_MARGIN = "2600px 0px";

function MediaCollection<T>({
  title,
  description,
  items,
  kind,
  mapItem,
  sortOptions,
  defaultSort,
  searchPlaceholder = "Filter...",
  isLoading = false,
  error,
  emptyMessage = DEFAULT_EMPTY_MESSAGE,
}: MediaCollectionProps<T>) {
  const [viewportSize, setViewportSize] = useState(() => ({
    width: typeof window !== "undefined" ? window.innerWidth : 1280,
    height: typeof window !== "undefined" ? window.innerHeight : 900,
  }));
  useEffect(() => {
    const handleResize = () => {
      setViewportSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortValue, setSortValue] = useState<string>(() => {
    if (defaultSort && sortOptions.some((option) => option.value === defaultSort)) {
      return defaultSort;
    }
    return sortOptions[0]?.value ?? "";
  });

  useEffect(() => {
    const fallback = defaultSort && sortOptions.some((option) => option.value === defaultSort)
      ? defaultSort
      : sortOptions[0]?.value ?? "";

    setSortValue((current) => {
      if (!fallback) {
        return current;
      }
      const currentIsValid = sortOptions.some((option) => option.value === current);
      return currentIsValid ? current : fallback;
    });
  }, [defaultSort, sortOptions]);

  const activeSort = useMemo(
    () => sortOptions.find((option) => option.value === sortValue) ?? sortOptions[0],
    [sortOptions, sortValue],
  );

  const sortedItems = useMemo(() => {
    if (!activeSort) {
      return items;
    }
    const copy = [...items];
    copy.sort(activeSort.compare);
    return copy;
  }, [activeSort, items]);

  const normalizedItems = useMemo(
    () =>
      sortedItems.map((item) => {
        const mapped = mapItem(item);
        const searchValue = (mapped.searchText ?? [mapped.title, mapped.subtitle, mapped.meta].filter(Boolean).join(" ")).toLowerCase();
        return { ...mapped, searchText: searchValue };
      }),
    [mapItem, sortedItems],
  );

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return normalizedItems;
    }
    return normalizedItems.filter((item) => item.searchText?.includes(query));
  }, [normalizedItems, searchQuery]);

  const pageSize = viewMode === "grid" ? GRID_PAGE_SIZE : LIST_PAGE_SIZE;
  const [visibleCount, setVisibleCount] = useState(pageSize);

  const [gridNode, setGridNode] = useState<HTMLDivElement | null>(null);
  const [gridWidth, setGridWidth] = useState(0);
  useEffect(() => {
    if (!gridNode) return;
    setGridWidth(gridNode.clientWidth);
    const resizeObserver = new ResizeObserver(() => setGridWidth(gridNode.clientWidth));
    resizeObserver.observe(gridNode);
    return () => resizeObserver.disconnect();
  }, [gridNode]);

  const desiredVisible = useMemo(() => {
    if (viewMode === "grid") {
      const containerWidth = gridWidth || viewportSize.width;
      const columns = Math.max(1, Math.floor(containerWidth / GRID_CARD_MIN_WIDTH));
      const rows = Math.max(1, Math.ceil(viewportSize.height / GRID_ROW_HEIGHT));
      return Math.max(pageSize, columns * rows + columns * 2);
    }
    const rows = Math.max(1, Math.ceil(viewportSize.height / LIST_ROW_HEIGHT));
    return Math.max(pageSize, rows + 6);
  }, [gridWidth, pageSize, viewportSize.height, viewportSize.width, viewMode]);

  useEffect(() => {
    setVisibleCount(() => Math.max(desiredVisible, pageSize));
  }, [desiredVisible, pageSize, searchQuery, activeSort]);

  useEffect(() => {
    setVisibleCount((current) => Math.min(Math.max(current, desiredVisible), filteredItems.length || desiredVisible));
  }, [desiredVisible, filteredItems.length, pageSize]);

  const hasMore = !isLoading && filteredItems.length > visibleCount;
  const loadMore = useCallback(() => {
    if (!hasMore) return;
    setVisibleCount((current) => {
      const next = Math.max(current + pageSize, desiredVisible);
      return Math.min(next, filteredItems.length);
    });
  }, [desiredVisible, filteredItems.length, hasMore, pageSize]);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore) return;
    const observer = new IntersectionObserver((entries) => {
      const [entry] = entries;
      if (entry.isIntersecting) {
        loadMore();
      }
    }, { rootMargin: INTERSECTION_ROOT_MARGIN });
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  const shouldShowSkeletons = isLoading && items.length === 0;
  const skeletonCount = viewMode === "grid" ? 12 : 6;
  const itemsToRender: MediaCollectionItem<T>[] = shouldShowSkeletons
    ? Array.from({ length: skeletonCount }, (_, index) => ({ id: `skeleton-${index}`, title: "" } as MediaCollectionItem<T>))
    : filteredItems.slice(0, visibleCount);

  const showEmptyState = !isLoading && filteredItems.length === 0;

  const handleViewChange = (value: string) => {
    setViewMode(value === "list" ? "list" : "grid");
  };

  const visibleCountLabel = useMemo(() => {
    if (isLoading) {
      return "Loading library...";
    }
    if (!searchQuery) {
      return `${normalizedItems.length.toLocaleString()} item${normalizedItems.length === 1 ? "" : "s"}`;
    }
    return `${filteredItems.length.toLocaleString()} of ${normalizedItems.length.toLocaleString()} shown`;
  }, [filteredItems.length, isLoading, normalizedItems.length, searchQuery]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-extrabold text-(--text)">{title}</h1>
        {description ? <p className="text-sm text-(--text-grey)">{description}</p> : null}
        {error ? <p className="text-sm text-(--danger1)">{error}</p> : null}
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <SearchInput
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder={searchPlaceholder}
          className="w-full md:max-w-sm"
        />
        <div className="flex flex-wrap items-center gap-3 md:justify-end">
          {activeSort ? (
            <Select
              size="small"
              value={activeSort.value}
              onValueChange={setSortValue}
              options={sortOptions.map((option) => ({ label: option.label, value: option.value }))}
              placeholder="Sort"
            />
          ) : null}
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={handleViewChange}
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
      </div>

      <div className="flex items-center justify-between text-xs text-(--text-grey)">
        <span>{visibleCountLabel}</span>
        {searchQuery ? <span className="truncate">Filtered by: {searchQuery}</span> : null}
      </div>

      {showEmptyState ? (
        <div className="flex min-h-[180px] items-center justify-center rounded-2xl border border-(--surface2) bg-(--surface1) text-sm text-(--text-grey)">
          {emptyMessage}
        </div>
      ) : viewMode === "grid" ? (
        <div
          ref={setGridNode}
          className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4"
        >
          {itemsToRender.map((item) => (
            <MediaCard
              key={item.id}
              kind={kind}
              title={!shouldShowSkeletons ? item.title : undefined}
              subtitle={!shouldShowSkeletons ? item.subtitle : undefined}
              meta={!shouldShowSkeletons ? item.meta : undefined}
              coverUrl={!shouldShowSkeletons ? item.coverUrl : undefined}
              onPlay={!shouldShowSkeletons ? item.onPlay : undefined}
              onPlayNext={!shouldShowSkeletons ? item.onPlayNext : undefined}
              onAddToQueue={!shouldShowSkeletons ? item.onAddToQueue : undefined}
              onClick={!shouldShowSkeletons ? item.onClick : undefined}
              isLoading={shouldShowSkeletons}
              className="w-full"
              style={{ maxWidth: "100%" }}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {itemsToRender.map((item) => (
            <MediaCard
              key={item.id}
              kind={kind}
              layout="row"
              title={!shouldShowSkeletons ? item.title : undefined}
              subtitle={!shouldShowSkeletons ? item.subtitle : undefined}
              meta={!shouldShowSkeletons ? item.meta : undefined}
              coverUrl={!shouldShowSkeletons ? item.coverUrl : undefined}
              onPlay={!shouldShowSkeletons ? item.onPlay : undefined}
              onPlayNext={!shouldShowSkeletons ? item.onPlayNext : undefined}
              onAddToQueue={!shouldShowSkeletons ? item.onAddToQueue : undefined}
              onClick={!shouldShowSkeletons ? item.onClick : undefined}
              isLoading={shouldShowSkeletons}
              className="w-full"
            />
          ))}
        </div>
      )}

      {!shouldShowSkeletons && filteredItems.length > 0 ? (
        <div ref={sentinelRef} className="flex items-center justify-center py-4">
          {hasMore ? <Spinner size="md" /> : null}
        </div>
      ) : null}
    </div>
  );
};

export default MediaCollection;
