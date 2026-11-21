import { useEffect, useRef, useState } from "react";
import { SearchIcon } from "../../constants/icons";
import cn from "../../utils/cn";
import Button from "../ui/Button";
import SearchInput from "../ui/SearchInput";
import Tooltip from "../ui/Tooltip";
import MediaActionButtons from "./MediaActionButtons";

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
      <MediaActionButtons
        title={title}
        onPlay={onPlay}
        isPlaying={isPlaying}
        onShuffle={onShuffle}
        shuffleActive={shuffleActive}
        onPlayNext={onPlayNext}
        onAddToQueue={onAddToQueue}
        size="large"
      />

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
            <Tooltip content="Search">
              <Button
                variant="ghost"
                size="large"
                aria-label={searchPlaceholder}
                className="text-text-grey hover:text-text"
                onClick={() => setSearchOpen(true)}
              >
                <SearchIcon />
              </Button>
            </Tooltip>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default CollectionActionBar;
