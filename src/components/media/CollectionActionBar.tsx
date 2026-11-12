import { useEffect, useRef, useState } from "react";
import {
  PauseIcon,
  PlayArrowIcon,
  PlaylistAddIcon,
  QueuePlayNextIcon,
  SearchIcon,
  ShuffleIcon,
} from "../../constants/icons";
import cn from "../../utils/cn";
import Button from "../ui/Button";
import SearchInput from "../ui/SearchInput";

export interface CollectionActionBarProps {
  title: string;
  onPlay?: () => void;
  isPlaying?: boolean;
  onShuffle?: () => void;
  shuffleActive?: boolean;
  onPlayNext?: () => void;
  onAddToQueue?: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;
  className?: string;
}

const CollectionActionBar = ({
  title,
  onPlay,
  isPlaying = false,
  onShuffle,
  shuffleActive = false,
  onPlayNext,
  onAddToQueue,
  searchQuery,
  onSearchChange,
  searchPlaceholder = "Search in list",
  className,
}: CollectionActionBarProps) => {
  const hasSearch = onSearchChange !== undefined;
  const [searchOpen, setSearchOpen] = useState(Boolean(searchQuery));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) inputRef.current?.focus();
  }, [searchOpen]);

  const closeSearch = () => {
    onSearchChange?.("");
    setSearchOpen(false);
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {onPlay ? (
        <Button
          variant="primary"
          size="large"
          aria-label={isPlaying ? `Pause ${title}` : `Play ${title}`}
          className="mr-2 h-12 w-12 shadow-lg"
          onClick={onPlay}
        >
          {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
        </Button>
      ) : null}
      {onShuffle ? (
        <Button
          variant="ghost"
          size="large"
          aria-label="Shuffle"
          aria-pressed={shuffleActive}
          title={shuffleActive ? "Shuffle on" : "Shuffle off"}
          className={shuffleActive
            ? "bg-surface-tonal2 text-primary0 hover:bg-surface-tonal3"
            : "text-text-grey hover:text-text"}
          onClick={onShuffle}
        >
          <ShuffleIcon />
        </Button>
      ) : null}
      {onPlayNext ? (
        <Button variant="ghost" size="large" aria-label={`Play ${title} next`} title="Play next" className="text-text-grey hover:text-text" onClick={onPlayNext}>
          <QueuePlayNextIcon />
        </Button>
      ) : null}
      {onAddToQueue ? (
        <Button variant="ghost" size="large" aria-label={`Add ${title} to queue`} title="Add to queue" className="text-text-grey hover:text-text" onClick={onAddToQueue}>
          <PlaylistAddIcon />
        </Button>
      ) : null}

      {hasSearch ? (
        <div className="ml-auto flex items-center gap-1">
          {searchOpen ? (
            <SearchInput
              ref={inputRef}
              value={searchQuery ?? ""}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              fieldSize="small"
              className="w-56"
              onChange={(event) => onSearchChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") closeSearch();
              }}
              onBlur={() => {
                if (!searchQuery) setSearchOpen(false);
              }}
            />
          ) : (
            <Button
              variant="ghost"
              size="large"
              aria-label={searchPlaceholder}
              title="Search"
              className="text-text-grey hover:text-text"
              onClick={() => setSearchOpen(true)}
            >
              <SearchIcon />
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default CollectionActionBar;
