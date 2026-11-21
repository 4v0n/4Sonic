import React from "react";
import { PauseIcon, PlayArrowIcon, PlaylistAddIcon, QueuePlayNextIcon, ShuffleIcon } from "../../constants/icons";
import cn from "../../utils/cn";
import Button from "../ui/Button";
import Tooltip from "../ui/Tooltip";
import type { MediaActions } from "./types";

export type MediaActionButtonsSize = "default" | "large";

export interface MediaActionButtonsProps extends MediaActions {
  title: string;
  isPlaying?: boolean;
  onShuffle?: () => void;
  shuffleActive?: boolean;
  size?: MediaActionButtonsSize;
  isolateClicks?: boolean;
  className?: string;
}

const GHOST = "text-text-grey hover:text-text";

const MediaActionButtons = ({
  title,
  onPlay,
  isPlaying = false,
  onShuffle,
  shuffleActive = false,
  onPlayNext,
  onAddToQueue,
  size = "default",
  isolateClicks = false,
  className,
}: MediaActionButtonsProps) => {
  if (!onPlay && !onShuffle && !onPlayNext && !onAddToQueue) return null;

  const handle = (action: () => void) => (event: React.MouseEvent) => {
    if (isolateClicks) event.stopPropagation();
    action();
  };

  return (
    <div className={cn("flex shrink-0 items-center gap-2", className)}>
      {onPlay ? (
        <Tooltip content={isPlaying ? "Pause" : "Play"}>
          <Button
            variant="primary"
            size="large"
            aria-label={isPlaying ? `Pause ${title}` : `Play ${title}`}
            className={cn("shadow-lg", size === "large" ? "mr-2 h-12 w-12" : "mr-1")}
            onClick={handle(onPlay)}
          >
            {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
          </Button>
        </Tooltip>
      ) : null}
      {onShuffle ? (
        <Tooltip content={shuffleActive ? "Shuffle on" : "Shuffle off"}>
          <Button
            variant="ghost"
            size="large"
            aria-label="Shuffle"
            aria-pressed={shuffleActive}
            className={shuffleActive ? "bg-surface-tonal2 text-primary0 hover:bg-surface-tonal3" : GHOST}
            onClick={handle(onShuffle)}
          >
            <ShuffleIcon />
          </Button>
        </Tooltip>
      ) : null}
      {onPlayNext ? (
        <Tooltip content="Play next">
          <Button variant="ghost" size="large" aria-label={`Play ${title} next`} className={GHOST} onClick={handle(onPlayNext)}>
            <QueuePlayNextIcon />
          </Button>
        </Tooltip>
      ) : null}
      {onAddToQueue ? (
        <Tooltip content="Add to queue">
          <Button variant="ghost" size="large" aria-label={`Add ${title} to queue`} className={GHOST} onClick={handle(onAddToQueue)}>
            <PlaylistAddIcon />
          </Button>
        </Tooltip>
      ) : null}
    </div>
  );
};

export default MediaActionButtons;
