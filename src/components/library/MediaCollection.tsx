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

  useEffect(() => {
    setVisibleCount(pageSize);
  }, [pageSize, searchQuery, activeSort]);

  useEffect(() => {
    setVisibleCount((current) => Math.min(current, filteredItems.length || pageSize));
  }, [filteredItems.length, pageSize]);

  const hasMore = !isLoading && filteredItems.length > visibleCount;
  const loadMore = useCallback(() => {
    if (!hasMore) return;
    setVisibleCount((current) => Math.min(current + pageSize, filteredItems.length));
  }, [filteredItems.length, hasMore, pageSize]);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore) return;
    const observer = new IntersectionObserver((entries) => {
      const [entry] = entries;
      if (entry.isIntersecting) {
        loadMore();
      }
    }, { rootMargin: "600px 0px" });
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
        <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4">
          {itemsToRender.map((item) => (
            <MediaCard
              key={item.id}
              kind={kind}
              title={!shouldShowSkeletons ? item.title : undefined}
              subtitle={!shouldShowSkeletons ? item.subtitle : undefined}
              meta={!shouldShowSkeletons ? item.meta : undefined}
              coverUrl={!shouldShowSkeletons ? item.coverUrl : undefined}
              onPlay={!shouldShowSkeletons ? item.onPlay : undefined}
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
