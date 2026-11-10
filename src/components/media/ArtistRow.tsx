import React from "react";
import { formatAlbumCount } from "./format";
import { RowArtwork, RowFrame, RowPlayButton, type RowFrameProps } from "./Row";

export interface ArtistRowProps extends Omit<RowFrameProps, "children" | "title"> {
  name: string;
  albumCount?: number;
  coverUrl?: string;
}

const ArtistRow = ({ name, albumCount, coverUrl, actions, ...props }: ArtistRowProps) => {
  const subtitle = formatAlbumCount(albumCount);

  return (
    <RowFrame actions={actions} {...props}>
      <RowArtwork coverUrl={coverUrl} alt={name} />
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="truncate text-base font-semibold text-text">{name}</p>
        {subtitle ? <p className="truncate text-sm text-text-grey">{subtitle}</p> : null}
      </div>
      <RowPlayButton label={name} onPlay={actions?.onPlay} />
    </RowFrame>
  );
};

export default React.memo(ArtistRow);
