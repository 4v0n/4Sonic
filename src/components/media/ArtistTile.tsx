import React from "react";
import { formatAlbumCount } from "./format";
import { TileArtwork, TileFrame, type TileFrameProps } from "./Tile";

export interface ArtistTileProps extends Omit<TileFrameProps, "children" | "title"> {
  name: string;
  albumCount?: number;
  coverUrl?: string;
}

const ArtistTile = ({ name, albumCount, coverUrl, actions, ...props }: ArtistTileProps) => {
  const subtitle = formatAlbumCount(albumCount);

  return (
    <TileFrame actions={actions} {...props}>
      <TileArtwork coverUrl={coverUrl} alt={name} onPlay={actions?.onPlay} />
      <div className="flex h-[68px] flex-col gap-1 pt-2">
        <p className="truncate text-sm font-semibold text-text">{name}</p>
        {subtitle ? (
          <p className="truncate text-xs text-text-grey">{subtitle}</p>
        ) : (
          <p className="truncate text-xs text-text-grey invisible" aria-hidden>Subtitle placeholder</p>
        )}
        <p className="truncate text-xs text-text-grey invisible" aria-hidden>Meta placeholder</p>
      </div>
    </TileFrame>
  );
};

export default React.memo(ArtistTile);
