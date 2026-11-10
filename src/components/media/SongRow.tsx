import React from "react";
import { formatSongMeta } from "./format";
import { RowArtwork, RowFrame, RowPlayButton, type RowFrameProps } from "./Row";

// NOTE: songs will most likely move to a dedicated track list/row rather than this card row.
export interface SongRowProps extends Omit<RowFrameProps, "children" | "title"> {
  title: string;
  artistName?: string;
  albumName?: string;
  year?: number;
  coverUrl?: string;
}

const SongRow = ({ title, artistName, albumName, year, coverUrl, actions, ...props }: SongRowProps) => {
  const meta = formatSongMeta(albumName, year);

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

export default React.memo(SongRow);
