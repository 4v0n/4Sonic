import React from "react";
import { formatSongMeta } from "./format";
import { TileArtwork, TileFrame, type TileFrameProps } from "./Tile";

// NOTE: songs will most likely move to a dedicated track list/row rather than tiles.
export interface SongTileProps extends Omit<TileFrameProps, "children" | "title"> {
  title: string;
  artistName?: string;
  albumName?: string;
  year?: number;
  coverUrl?: string;
}

const SongTile = ({ title, artistName, albumName, year, coverUrl, actions, ...props }: SongTileProps) => {
  const meta = formatSongMeta(albumName, year);

  return (
    <TileFrame actions={actions} {...props}>
      <TileArtwork coverUrl={coverUrl} alt={title} onPlay={actions?.onPlay} />
      <div className="flex min-h-[60px] flex-col gap-1 pt-2">
        <p className="truncate text-sm font-semibold text-text">{title}</p>
        {artistName ? (
          <p className="truncate text-xs text-text-grey">{artistName}</p>
        ) : (
          <p className="truncate text-xs text-text-grey invisible" aria-hidden>Subtitle placeholder</p>
        )}
        {meta ? (
          <p className="truncate text-xs text-text-grey">{meta}</p>
        ) : (
          <p className="truncate text-xs text-text-grey invisible" aria-hidden>Meta placeholder</p>
        )}
      </div>
    </TileFrame>
  );
};

export default React.memo(SongTile);
