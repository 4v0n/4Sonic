import React from "react";
import { PlayArrowIcon } from "../../constants/icons";
import cn from "../../utils/cn";
import { hsla, type HslColor } from "../../utils/imageColor";
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

export type TileStackDepth = 0 | 1 | 2;

const STACK_LAYERS = [
  { className: "mx-[10%] h-1", fallback: "bg-surface4/50", alpha: 0.45 },
  { className: "mx-[5%] h-1.5", fallback: "bg-surface4", alpha: 0.8 },
] as const;

const TileStack = ({ depth, color }: { depth: TileStackDepth; color?: HslColor }) => (
  <>
    {STACK_LAYERS.map((layer, index) => (
      <div
        key={layer.className}
        aria-hidden
        className={cn(
          "rounded-t-md transition-colors duration-300",
          layer.className,
          !color && layer.fallback,
          index < STACK_LAYERS.length - depth && "invisible",
        )}
        style={color ? { backgroundColor: hsla(color, layer.alpha) } : undefined}
      />
    ))}
  </>
);

interface TileArtworkProps {
  coverUrl?: string;
  alt: string;
  onPlay?: () => void;
  stack?: TileStackDepth;
  stackColor?: HslColor;
  className?: string;
}

export const TileArtwork = ({ coverUrl, alt, onPlay, stack = 0, stackColor, className }: TileArtworkProps) => (
  <div className={cn("flex w-full flex-col gap-px", className)}>
    <TileStack depth={stack} color={stackColor} />
    <div className="relative aspect-square rounded-md w-full overflow-hidden bg-surface0 shadow transition-shadow group-hover:shadow-md">
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
  </div>
);

interface TileCountBadgeProps {
  count: number;
  icon: React.ReactNode;
  label: string;
  color?: HslColor;
}

const BADGE_MAX_LIGHTNESS = 40;

export const TileCountBadge = ({ count, icon, label, color }: TileCountBadgeProps) => (
  <span
    title={label}
    aria-label={label}
    className={cn(
      "flex shrink-0 items-center gap-1 rounded-full px-1.5 text-sm font-semibold leading-5 tabular-nums transition-colors duration-300",
      color ? "text-light" : "bg-surface2 text-text-grey group-hover:bg-surface3",
    )}
    style={color ? { backgroundColor: hsla({ ...color, l: Math.min(color.l, BADGE_MAX_LIGHTNESS) }) } : undefined}
  >
    <span aria-hidden className="flex text-[1em]">{icon}</span>
    {count}
  </span>
);

export const TileSkeleton = ({ className }: { className?: string }) => (
  <div aria-hidden className={cn("max-w-[220px] p-3 animate-pulse", className)}>
    <div className="flex w-full flex-col gap-px">
      <TileStack depth={0} />
      <div className="aspect-square w-full rounded-md bg-surface2" />
    </div>
    <div className="flex h-[68px] flex-col gap-1 pt-2">
      <div className="my-0.5 h-4 w-3/4 rounded bg-surface2" />
      <div className="my-0.5 h-3 w-1/2 rounded bg-surface2" />
    </div>
  </div>
);
