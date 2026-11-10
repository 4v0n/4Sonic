import React from "react";
import { PlayArrowIcon } from "../../constants/icons";
import cn from "../../utils/cn";
import Button from "../ui/Button";
import CoverImage from "../ui/CoverImage";
import MediaContextMenu from "./MediaContextMenu";
import type { MediaActions } from "./types";

/**
 * Building blocks for list rows. Each media type composes these into its own row.
 */

export interface RowFrameProps extends React.HTMLAttributes<HTMLDivElement> {
  actions?: MediaActions;
}

export const RowFrame = ({ actions, className, children, ...props }: RowFrameProps) => (
  <MediaContextMenu actions={actions}>
    <div
      {...props}
      className={cn(
        "group flex items-center gap-4 rounded-lg border border-surface2 bg-surface1 p-2 shadow transition",
        "hover:border-surface3 hover:bg-surface2 hover:shadow-md cursor-pointer",
        className,
      )}
    >
      {children}
    </div>
  </MediaContextMenu>
);

interface RowArtworkProps {
  coverUrl?: string;
  alt: string;
  className?: string;
}

export const RowArtwork = ({ coverUrl, alt, className }: RowArtworkProps) => (
  <CoverImage
    src={coverUrl}
    alt={alt}
    rounded
    className={cn(
      "relative h-20 w-20 overflow-hidden rounded-md bg-surface0 shadow transition-shadow group-hover:shadow-md",
      className,
    )}
  />
);

interface RowPlayButtonProps {
  label: string;
  onPlay?: () => void;
}

export const RowPlayButton = ({ label, onPlay }: RowPlayButtonProps) => {
  if (!onPlay) return null;
  return (
    <Button
      variant="primary"
      size="large"
      aria-label={`Play ${label}`}
      className="opacity-0 transition duration-200 group-hover:opacity-100 shadow-lg"
      onClick={(event) => {
        event.stopPropagation();
        onPlay();
      }}
    >
      <PlayArrowIcon />
    </Button>
  );
};

export const RowSkeleton = ({ className }: { className?: string }) => (
  <div
    className={cn(
      "flex items-center gap-4 rounded-2xl border border-surface2 bg-surface1 px-4 py-3 shadow-sm animate-pulse",
      className,
    )}
  >
    <div className="h-16 w-16 rounded-lg bg-surface2" />
    <div className="flex-1 space-y-2">
      <div className="h-3 w-20 rounded bg-surface2" />
      <div className="h-4 w-3/4 rounded bg-surface2" />
      <div className="h-3 w-1/3 rounded bg-surface2" />
    </div>
    <div className="h-10 w-10 rounded-full bg-surface2" />
  </div>
);
