import React from "react";
import { PlayArrowIcon } from "../../constants/icons";
import cn from "../../utils/cn";
import Button from "./Button";
import LazyImage from "./LazyImage";

type MediaKind = "artist" | "album" | "song";
type MediaLayout = "square" | "row";

export interface MediaCardProps extends React.HTMLAttributes<HTMLDivElement> {
  kind: MediaKind;
  title?: string;
  subtitle?: string;
  meta?: string;
  coverUrl?: string;
  onPlay?: () => void;
  layout?: MediaLayout;
  isLoading?: boolean;
}

const TYPE_LABEL: Record<MediaKind, string> = {
  artist: "Artist",
  album: "Album",
  song: "Song",
};

const CoverFallback = ({ rounded }: { rounded?: boolean }) => (
  <div
    className={cn(
      "h-full w-full bg-gradient-to-br from-(--surface-tonal1) via-(--surface-tonal2) to-(--surface-tonal3)",
      rounded ? "rounded-lg" : "",
    )}
  />
);

const TileSkeleton = ({ className }: { className?: string }) => (
  <div
    className={cn(
      "max-w-[220px] overflow-hidden rounded-2xl border border-(--surface2) bg-(--surface1) shadow-sm animate-pulse",
      className,
    )}
  >
    <div className="aspect-square bg-(--surface2)" />
    <div className="space-y-2 p-3">
      <div className="h-4 w-3/4 rounded bg-(--surface2)" />
      <div className="h-3 w-1/2 rounded bg-(--surface2)" />
    </div>
  </div>
);

const RowSkeleton = ({ className }: { className?: string }) => (
  <div
    className={cn(
      "flex items-center gap-4 rounded-2xl border border-(--surface2) bg-(--surface1) px-4 py-3 shadow-sm animate-pulse",
      className,
    )}
  >
    <div className="h-16 w-16 rounded-lg bg-(--surface2)" />
    <div className="flex-1 space-y-2">
      <div className="h-3 w-20 rounded bg-(--surface2)" />
      <div className="h-4 w-3/4 rounded bg-(--surface2)" />
      <div className="h-3 w-1/3 rounded bg-(--surface2)" />
    </div>
    <div className="h-10 w-10 rounded-full bg-(--surface2)" />
  </div>
);

const MediaCard: React.FC<MediaCardProps> = ({
  kind,
  title,
  subtitle,
  meta,
  coverUrl,
  onPlay,
  onClick,
  layout = "square",
  isLoading = false,
  className = "",
  ...props
}) => {
  const handlePlayClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onPlay?.();
  };

  if (isLoading) {
    return layout === "row" ? <RowSkeleton className={className} /> : <TileSkeleton className={className} />;
  }

  if (layout === "row") {
    return (
      <div
        {...props}
        className={cn(
          "group flex items-center gap-4 rounded-2xl border border-(--surface2) bg-(--surface1) px-4 py-3 shadow-sm transition hover:-translate-y-[1px] hover:border-(--surface3) hover:bg-(--surface2) hover:shadow-md",
          onClick ? "cursor-pointer" : "",
          className,
        )}
        onClick={onClick}
      >
        <div className="relative h-16 w-16 overflow-hidden rounded-lg bg-(--surface0)">
          {coverUrl ? (
            <LazyImage
              src={coverUrl}
              alt={title ?? TYPE_LABEL[kind]}
              className="h-full w-full"
              placeholder={<CoverFallback rounded />}
              fallback={<CoverFallback rounded />}
            />
          ) : (
            <CoverFallback rounded />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-(--text-grey)">{TYPE_LABEL[kind]}</p>
          <p className="truncate text-base font-semibold text-(--text)">{title ?? "Unknown"}</p>
          {subtitle ? <p className="truncate text-sm text-(--text-grey)">{subtitle}</p> : null}
          {meta ? <p className="text-xs text-(--text-grey)">{meta}</p> : null}
        </div>
        {onPlay ? (
          <Button
            variant="primary"
            size="large"
            aria-label={`Play ${title ?? TYPE_LABEL[kind]}`}
            className="opacity-0 transition duration-200 group-hover:opacity-100 shadow-lg"
            onClick={handlePlayClick}
          >
            <PlayArrowIcon />
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div
      {...props}
      className={cn(
        "group max-w-[220px] overflow-hidden rounded-2xl border border-(--surface2) bg-(--surface1) shadow-sm transition hover:-translate-y-[2px] hover:border-(--surface3) hover:shadow-lg",
        onClick ? "cursor-pointer" : "",
        className,
      )}
      onClick={onClick}
    >
      <div className="relative aspect-square w-full overflow-hidden bg-(--surface0)">
        {coverUrl ? (
          <LazyImage
            src={coverUrl}
            alt={title ?? TYPE_LABEL[kind]}
            className="h-full w-full"
            placeholder={<CoverFallback />}
            fallback={<CoverFallback />}
          />
        ) : (
          <CoverFallback />
        )}
        {onPlay ? (
          <>
            <div className="absolute inset-0 bg-black/25 opacity-0 transition group-hover:opacity-100" />
            <Button
              variant="primary"
              size="large"
              aria-label={`Play ${title ?? TYPE_LABEL[kind]}`}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 transition duration-150 group-hover:opacity-100 shadow-lg"
              onClick={handlePlayClick}
            >
              <PlayArrowIcon />
            </Button>
          </>
        ) : null}
      </div>
      <div className="space-y-1 p-3">
        <p className="truncate text-sm font-semibold text-(--text)">{title ?? "Unknown"}</p>
        {subtitle ? <p className="truncate text-xs text-(--text-grey)">{subtitle}</p> : null}
        {meta ? <p className="text-xs text-(--text-grey)">{meta}</p> : null}
      </div>
    </div>
  );
};

export default React.memo(MediaCard);
