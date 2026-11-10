import React from "react";
import type { AlbumDisplayOptions } from "./AlbumTile";
import { formatAlbumMeta } from "./format";
import { RowArtwork, RowFrame, RowPlayButton, type RowFrameProps } from "./Row";

export interface AlbumRowProps extends Omit<RowFrameProps, "children" | "title">, AlbumDisplayOptions {
  title: string;
  artistName?: string;
  year?: number;
  songCount?: number;
  coverUrl?: string;
}

const AlbumRow = ({
  title,
  artistName,
  year,
  songCount,
  coverUrl,
  actions,
  showArtist = true,
  showYear = true,
  showTrackCount = true,
  ...props
}: AlbumRowProps) => {
  const meta = formatAlbumMeta(showYear ? year : undefined, showTrackCount ? songCount : undefined);

  return (
    <RowFrame actions={actions} {...props}>
      <RowArtwork coverUrl={coverUrl} alt={title} />
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="truncate text-base font-semibold text-text">{title}</p>
        {showArtist && artistName ? <p className="truncate text-sm text-text-grey">{artistName}</p> : null}
        {meta ? <p className="text-xs text-text-grey">{meta}</p> : null}
      </div>
      <RowPlayButton label={title} onPlay={actions?.onPlay} />
    </RowFrame>
  );
};

export default React.memo(AlbumRow);
