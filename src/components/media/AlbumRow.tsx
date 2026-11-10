import React from "react";
import { formatAlbumMeta } from "./format";
import { RowArtwork, RowFrame, RowPlayButton, type RowFrameProps } from "./Row";

export interface AlbumRowProps extends Omit<RowFrameProps, "children" | "title"> {
  title: string;
  artistName?: string;
  year?: number;
  songCount?: number;
  coverUrl?: string;
}

const AlbumRow = ({ title, artistName, year, songCount, coverUrl, actions, ...props }: AlbumRowProps) => {
  const meta = formatAlbumMeta(year, songCount);

  return (
    <RowFrame actions={actions} {...props}>
      <RowArtwork coverUrl={coverUrl} alt={title} />
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="truncate text-base font-semibold text-text">{title}</p>
        {artistName ? <p className="truncate text-sm text-text-grey">{artistName}</p> : null}
        {meta ? <p className="text-xs text-text-grey">{meta}</p> : null}
      </div>
      <RowPlayButton label={title} onPlay={actions?.onPlay} />
    </RowFrame>
  );
};

export default React.memo(AlbumRow);
