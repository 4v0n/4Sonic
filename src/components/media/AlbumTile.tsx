import React from "react";
import { AlbumIcon } from "../../constants/icons";
import useImageAccentColor from "../../hooks/useImageAccentColor";
import { TileArtwork, TileCountBadge, TileFrame, type TileFrameProps } from "./Tile";

export interface AlbumDisplayOptions {
  showArtist?: boolean;
  showYear?: boolean;
  showTrackCount?: boolean;
}

export interface AlbumTileProps extends Omit<TileFrameProps, "children" | "title">, AlbumDisplayOptions {
  title: string;
  artistName?: string;
  year?: number;
  songCount?: number;
  coverUrl?: string;
}

const AlbumTile = ({
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
}: AlbumTileProps) => {
  const accentColor = useImageAccentColor(coverUrl);

  return (
    <TileFrame actions={actions} {...props}>
      <TileArtwork coverUrl={coverUrl} alt={title} onPlay={actions?.onPlay} stack={2} stackColor={accentColor} />
      <div className="flex h-[68px] flex-col gap-1 pt-2">
        <div className="flex items-center gap-2">
          <p className="min-w-0 flex-1 truncate text-sm font-semibold text-text">{title}</p>
          {showTrackCount && songCount ? (
            <TileCountBadge
              count={songCount}
              icon={<AlbumIcon fontSize="inherit" />}
              label={`${songCount} track${songCount === 1 ? "" : "s"}`}
              color={accentColor}
            />
          ) : null}
        </div>
        {showArtist && artistName ? <p className="truncate text-xs text-text-grey">{artistName}</p> : null}
        {showYear && year ? <p className="truncate text-xs text-text-grey">{year}</p> : null}
      </div>
    </TileFrame>
  );
};

export default React.memo(AlbumTile);
