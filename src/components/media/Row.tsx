import React from "react";
import cn from "../../utils/cn";
import type { HslColor } from "../../utils/imageColor";
import { MetaList } from "./CollectionLayout";
import MediaActionButtons from "./MediaActionButtons";
import MediaContextMenu from "./MediaContextMenu";
import { TileArtwork, type TileStackDepth } from "./Tile";
import type { MediaActions } from "./types";

export type RowSize = "default" | "compact";

export interface MediaRowProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title: string;
  meta?: React.ReactNode[];
  coverUrl?: string;
  stack?: TileStackDepth;
  stackColor?: HslColor;
  size?: RowSize;
  actions?: MediaActions;
  actionsOnHover?: boolean;
}

const ARTWORK_WIDTH: Record<RowSize, string> = {
  default: "w-32",
  compact: "w-20",
};

export const MediaRow = ({
  title,
  meta,
  coverUrl,
  stack = 0,
  stackColor,
  size = "default",
  actions,
  actionsOnHover = false,
  onClick,
  onKeyDown,
  className,
  ...props
}: MediaRowProps) => {
  const isCompact = size === "compact";
  const hasMeta = meta?.some((item) => item !== null && item !== undefined && item !== false && item !== "");
  const rowActions = (
    <MediaActionButtons
      title={title}
      {...actions}
      isolateClicks
      className={cn(
        isCompact && "pr-1",
        actionsOnHover && "opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100",
      )}
    />
  );

  return (
    <MediaContextMenu actions={actions}>
      <div
        role={onClick ? "link" : undefined}
        tabIndex={onClick ? 0 : undefined}
        aria-label={onClick ? title : undefined}
        onClick={onClick}
        onKeyDown={(event) => {
          onKeyDown?.(event);
          if (onClick && event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault();
            event.currentTarget.click();
          }
        }}
        {...props}
        className={cn(
          "group flex gap-5 rounded-xl p-3 outline-none transition-colors hover:bg-surface2/60 focus-within:bg-surface2/60",
          "focus-visible:ring-2 focus-visible:ring-primary0/40",
          isCompact ? "items-center gap-4 p-2" : "items-start",
          onClick && "cursor-pointer",
          className,
        )}
      >
        <div className={cn("shrink-0", ARTWORK_WIDTH[size])}>
          <TileArtwork coverUrl={coverUrl} alt={title} stack={stack} stackColor={stackColor} />
        </div>

        <div className={cn("flex min-w-0 flex-1 flex-col", isCompact ? "gap-0.5" : "gap-2.5 pt-2")}>
          <p className={cn("truncate font-bold text-text", isCompact ? "text-base" : "text-xl")}>{title}</p>
          {hasMeta ? (
            <div className={cn("text-text-grey", isCompact ? "text-xs" : "text-sm")}>
              <MetaList items={meta ?? []} />
            </div>
          ) : null}
          {isCompact ? null : rowActions}
        </div>

        {isCompact ? rowActions : null}
      </div>
    </MediaContextMenu>
  );
};

export const RowSkeleton = ({ className, size = "compact" }: { className?: string; size?: RowSize }) => (
  <div
    aria-hidden
    className={cn(
      "flex gap-4 rounded-xl p-2 animate-pulse",
      size === "compact" ? "items-center" : "items-start gap-5 p-3",
      className,
    )}
  >
    <div className={cn("aspect-square shrink-0 rounded-md bg-surface2", ARTWORK_WIDTH[size])} />
    <div className="flex-1 space-y-2">
      <div className="h-4 w-1/2 rounded bg-surface2" />
      <div className="h-3 w-1/3 rounded bg-surface2" />
    </div>
  </div>
);
