import React from "react";
import { formatAlbumMeta } from "./format";
import { TileArtwork, TileFrame, type TileFrameProps } from "./Tile";

export interface AlbumTileProps extends Omit<TileFrameProps, "children" | "title"> {
  title: string;
  artistName?: string;
  year?: number;
  songCount?: number;
  coverUrl?: string;
}

const AlbumTile = ({ title, artistName, year, songCount, coverUrl, actions, ...props }: AlbumTileProps) => {
  const meta = formatAlbumMeta(year, songCount);

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

export default React.memo(AlbumTile);
