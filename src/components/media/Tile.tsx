import React from "react";
import { PlayArrowIcon } from "../../constants/icons";
import cn from "../../utils/cn";
import Button from "../ui/Button";
import CoverImage from "../ui/CoverImage";
import MediaContextMenu from "./MediaContextMenu";
import type { MediaActions } from "./types";

/**
 * Building blocks for grid tiles. Each media type (artist, album, playlist, ...)
 * composes these into its own tile so it can diverge visually without
 * branching inside a shared component.
 */

export interface TileFrameProps extends React.HTMLAttributes<HTMLDivElement> {
  actions?: MediaActions;
}

export const TileFrame = ({ actions, className, children, ...props }: TileFrameProps) => (
  <MediaContextMenu actions={actions}>
    <div
      {...props}
      className={cn(
        "group max-w-[220px] p-3 overflow-hidden rounded-lg bg-transparent shadow",
        "transition hover:bg-surface2 hover:shadow-lg cursor-pointer",
        className,
      )}
    >
      {children}
    </div>
  </MediaContextMenu>
);

interface TileArtworkProps {
  coverUrl?: string;
  alt: string;
  onPlay?: () => void;
  className?: string;
}

export const TileArtwork = ({ coverUrl, alt, onPlay, className }: TileArtworkProps) => (
  <div
    className={cn(
      "relative aspect-square rounded-md w-full overflow-hidden bg-surface0 shadow transition-shadow group-hover:shadow-md",
      className,
    )}
  >
    <CoverImage src={coverUrl} alt={alt} className="h-full w-full" />
    {onPlay ? (
      <>
        <div className="absolute inset-0 bg-black/25 opacity-0 transition group-hover:opacity-100" />
        <Button
          variant="primary"
          size="large"
          aria-label={`Play ${alt}`}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 transition duration-150 group-hover:opacity-100 shadow-lg"
          onClick={(event) => {
            event.stopPropagation();
            onPlay();
          }}
        >
          <PlayArrowIcon />
        </Button>
      </>
    ) : null}
  </div>
);

export const TileSkeleton = ({ className }: { className?: string }) => (
  <div
    className={cn(
      "max-w-[220px] overflow-hidden rounded-2xl border border-surface2 bg-surface1 shadow-sm animate-pulse",
      className,
    )}
  >
    <div className="aspect-square bg-surface2" />
    <div className="space-y-2 p-3">
      <div className="h-4 w-3/4 rounded bg-surface2" />
      <div className="h-3 w-1/2 rounded bg-surface2" />
    </div>
  </div>
);
