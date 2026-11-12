import { Fragment, ReactNode, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { GridViewIcon, ListViewIcon } from "../../constants/icons";
import { RowSkeleton } from "../media/Row";
import { TileSkeleton } from "../media/Tile";
import SearchInput from "../ui/SearchInput";
import Select from "../ui/Select";
import { ToggleGroup, ToggleGroupItem } from "../ui/ToggleGroup";
import { useScrollContainer } from "../layout/ScrollContainer";
import useHistoryEntryState, { useHistoryEntryRef } from "../../hooks/useHistoryEntryState";
import { useRestoredScrollTop } from "../../hooks/useScrollRestoration";
import useVirtualRows from "../../hooks/useVirtualRows";

type ViewMode = "grid" | "list";

export type MediaSortOption<T> = {
  value: string;
  label: string;
  compare: (left: T, right: T) => number;
};

interface MediaCollectionProps<T> {
  title: string;
  description?: string;
  items: T[];
  getKey: (item: T) => string;
  getSearchText: (item: T) => string;
  renderTile: (item: T) => ReactNode;
  renderRow: (item: T) => ReactNode;
  sortOptions: MediaSortOption<T>[];
  defaultSort?: string;
  searchPlaceholder?: string;
  isLoading?: boolean;
  error?: string;
  emptyMessage?: string;
  stateKey?: string;
}

const DEFAULT_EMPTY_MESSAGE = "Nothing matches your filters yet.";
const GRID_CARD_MIN_WIDTH = 180;
const GRID_GAP = 16;
const LIST_GAP = 12;
const GRID_TILE_EXTRA_HEIGHT = 80;
const LIST_ROW_HEIGHT = 98;
const OVERSCAN_PX = 500;

const rowHeightCache = new Map<string, number>();
const MAX_ROW_HEIGHT_ENTRIES = 200;
let lastListWidth: number | undefined;

const guessListWidth = (scrollRoot: HTMLElement | null) => {
  if (lastListWidth !== undefined) return lastListWidth;
  if (!scrollRoot) return window.innerWidth;
  const style = getComputedStyle(scrollRoot);
  return scrollRoot.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
};

function MediaCollection<T>({
  title,
  description,
  items,
  getKey,
  getSearchText,
  renderTile,
  renderRow,
  sortOptions,
  defaultSort,
  searchPlaceholder = "Filter...",
  isLoading = false,
  error,
  emptyMessage = DEFAULT_EMPTY_MESSAGE,
  stateKey,
}: MediaCollectionProps<T>) {
  const stateId = `media-collection:${stateKey ?? title}`;
  const [viewMode, setViewMode] = useHistoryEntryState<ViewMode>(`${stateId}:view`, "grid");
  const [searchQuery, setSearchQuery] = useHistoryEntryState(`${stateId}:search`, "");
  const [sortValue, setSortValue] = useHistoryEntryState<string>(`${stateId}:sort`, () => {
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
  }, [defaultSort, setSortValue, sortOptions]);

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

  const entries = useMemo(
    () => sortedItems.map((item) => ({
      item,
      key: getKey(item),
      searchText: getSearchText(item).toLowerCase(),
    })),
    [getKey, getSearchText, sortedItems],
  );

  const filteredEntries = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return entries;
    }
    return entries.filter((entry) => entry.searchText.includes(query));
  }, [entries, searchQuery]);

  const renderItem = viewMode === "grid" ? renderTile : renderRow;
  const nodeCache = useMemo(() => new Map<string, ReactNode>(), [items, renderItem]);
  const getNode = (entry: { item: T; key: string }) => {
    let node = nodeCache.get(entry.key);
    if (node === undefined) {
      node = renderItem(entry.item);
      nodeCache.set(entry.key, node);
    }
    return node;
  };

  const scrollRoot = useScrollContainer();
  const [listNode, setListNode] = useState<HTMLDivElement | null>(null);
  const [listWidth, setListWidth] = useState(() => guessListWidth(scrollRoot));
  useLayoutEffect(() => {
    if (!listNode) return;
    const measure = () => {
      const width = listNode.clientWidth;
      if (width <= 0) return;
      lastListWidth = width;
      setListWidth(width);
    };
    measure();
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(listNode);
    return () => resizeObserver.disconnect();
  }, [listNode]);

  const isGrid = viewMode === "grid";
  const gap = isGrid ? GRID_GAP : LIST_GAP;
  const columns = isGrid
    ? Math.max(1, Math.floor((listWidth + GRID_GAP) / (GRID_CARD_MIN_WIDTH + GRID_GAP)))
    : 1;
  const rowCount = Math.ceil(filteredEntries.length / columns);

  const sizeKey = `${stateId}:${viewMode}:${columns}:${Math.round(listWidth)}`;
  const estimatedRowHeight = isGrid
    ? (listWidth - (columns - 1) * GRID_GAP) / columns + GRID_TILE_EXTRA_HEIGHT
    : LIST_ROW_HEIGHT;
  const rowHeight = rowHeightCache.get(sizeKey) ?? estimatedRowHeight;
  const [, setMeasureVersion] = useState(0);

  const restoredScrollTop = useRestoredScrollTop();
  const listOffsetRef = useHistoryEntryRef(`${stateId}:list-offset`, 0);
  const { start, end, totalHeight, offsetTop } = useVirtualRows({
    rowCount,
    rowHeight,
    gap,
    overscan: Math.ceil(OVERSCAN_PX / (rowHeight + gap)),
    scrollElement: scrollRoot,
    listElement: listNode,
    initialScrollTop: restoredScrollTop,
    listOffsetRef,
  });

  const shouldShowSkeletons = isLoading && items.length === 0;
  const showEmptyState = !isLoading && filteredEntries.length === 0;
  const renderedRows = end - start;

  const blockRef = useRef<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    const block = blockRef.current;
    if (!block || renderedRows <= 0 || !listNode || listNode.clientWidth !== listWidth) return;
    const measured = (block.getBoundingClientRect().height - (renderedRows - 1) * gap) / renderedRows;
    if (measured > 0 && Math.abs(measured - rowHeight) > 0.25) {
      if (rowHeightCache.size >= MAX_ROW_HEIGHT_ENTRIES) rowHeightCache.clear();
      rowHeightCache.set(sizeKey, measured);
      setMeasureVersion((version) => version + 1);
    }
  });

  const handleViewChange = (value: string) => {
    setViewMode(value === "list" ? "list" : "grid");
  };

  const visibleCountLabel = useMemo(() => {
    if (isLoading) {
      return "Loading library...";
    }
    if (!searchQuery) {
      return `${entries.length.toLocaleString()} item${entries.length === 1 ? "" : "s"}`;
    }
    return `${filteredEntries.length.toLocaleString()} of ${entries.length.toLocaleString()} shown`;
  }, [entries.length, filteredEntries.length, isLoading, searchQuery]);

  const skeletonCount = isGrid ? 12 : 6;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-extrabold text-text">{title}</h1>
        {description ? <p className="text-sm text-text-grey">{description}</p> : null}
        {error ? <p className="text-sm text-danger1">{error}</p> : null}
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

      <div className="flex items-center justify-between text-xs text-text-grey">
        <span>{visibleCountLabel}</span>
        {searchQuery ? <span className="truncate">Filtered by: {searchQuery}</span> : null}
      </div>

      <div ref={setListNode}>
        {showEmptyState ? (
          <div className="flex min-h-[180px] items-center justify-center rounded-2xl border border-surface2 bg-surface1 text-sm text-text-grey">
            {emptyMessage}
          </div>
        ) : shouldShowSkeletons ? (
          <div
            className={isGrid ? "grid gap-4" : "flex flex-col gap-3"}
            style={isGrid ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` } : undefined}
          >
            {Array.from({ length: skeletonCount }, (_, index) => (
              isGrid
                ? <TileSkeleton key={index} className="w-full max-w-full" />
                : <RowSkeleton key={index} className="w-full" />
            ))}
          </div>
        ) : (
          <div className="relative" style={{ height: totalHeight }}>
            <div
              ref={blockRef}
              className={isGrid ? "absolute inset-x-0 grid gap-4" : "absolute inset-x-0 flex flex-col gap-3"}
              style={{
                top: offsetTop,
                gridTemplateColumns: isGrid ? `repeat(${columns}, minmax(0, 1fr))` : undefined,
              }}
            >
              {filteredEntries.slice(start * columns, end * columns).map((entry) => (
                <Fragment key={entry.key}>{getNode(entry)}</Fragment>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MediaCollection;
