import React from "react";
import { PlayArrowIcon, PlaylistAddIcon, QueuePlayNextIcon } from "../../constants/icons";
import useImageAccentColor from "../../hooks/useImageAccentColor";
import { formatTotalDuration } from "../../utils/time";
import { MetaList } from "../media/CollectionLayout";
import MediaContextMenu from "../media/MediaContextMenu";
import { TileArtwork } from "../media/Tile";
import type { MediaActions } from "../media/types";
import Button from "../ui/Button";
import Tooltip from "../ui/Tooltip";

export interface ArtistReleaseRowProps {
  title: string;
  coverUrl?: string;
  year?: number;
  songCount?: number;
  duration?: number;
  actions?: MediaActions;
  onOpen: () => void;
}

const withoutOpening = (action: () => void) => (event: React.MouseEvent) => {
  event.stopPropagation();
  action();
};

const ArtistReleaseRow = ({ title, coverUrl, year, songCount, duration, actions, onOpen }: ArtistReleaseRowProps) => {
  const accentColor = useImageAccentColor(coverUrl);

  return (
    <MediaContextMenu actions={actions}>
      <div
        role="link"
        tabIndex={0}
        aria-label={title}
        onClick={onOpen}
        onKeyDown={(event) => {
          if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault();
            onOpen();
          }
        }}
        className="group flex cursor-pointer items-start gap-5 rounded-xl p-3 outline-none transition-colors hover:bg-surface2/60 focus-visible:bg-surface2/60 focus-visible:ring-2 focus-visible:ring-primary0/40"
      >
        <div className="w-28 shrink-0 @2xl:w-32">
          <TileArtwork coverUrl={coverUrl} alt={title} stack={2} stackColor={accentColor} />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-2.5 pt-2">
          <p className="truncate text-xl font-bold text-text">{title}</p>
          <div className="text-sm text-text-grey">
            <MetaList
              items={[
                year,
                songCount ? `${songCount} song${songCount === 1 ? "" : "s"}` : null,
                duration ? formatTotalDuration(duration) : null,
              ]}
            />
          </div>
          <div className="flex items-center gap-2">
            {actions?.onPlay ? (
              <Tooltip content="Play">
                <Button variant="primary" size="large" aria-label={`Play ${title}`} className="mr-1" onClick={withoutOpening(actions.onPlay)}>
                  <PlayArrowIcon />
                </Button>
              </Tooltip>
            ) : null}
            {actions?.onPlayNext ? (
              <Tooltip content="Play next">
                <Button variant="ghost" size="large" aria-label={`Play ${title} next`} className="text-text-grey hover:text-text" onClick={withoutOpening(actions.onPlayNext)}>
                  <QueuePlayNextIcon />
                </Button>
              </Tooltip>
            ) : null}
            {actions?.onAddToQueue ? (
              <Tooltip content="Add to queue">
                <Button variant="ghost" size="large" aria-label={`Add ${title} to queue`} className="text-text-grey hover:text-text" onClick={withoutOpening(actions.onAddToQueue)}>
                  <PlaylistAddIcon />
                </Button>
              </Tooltip>
            ) : null}
          </div>
        </div>
      </div>
    </MediaContextMenu>
  );
};

export default React.memo(ArtistReleaseRow);
