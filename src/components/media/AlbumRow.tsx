import React from "react";
import useImageAccentColor from "../../hooks/useImageAccentColor";
import { formatTotalDuration } from "../../utils/time";
import type { AlbumDisplayOptions } from "./AlbumTile";
import { formatCount } from "./format";
import { MediaRow, type MediaRowProps } from "./Row";

export interface AlbumRowProps
  extends Omit<MediaRowProps, "meta" | "stack" | "stackColor">, AlbumDisplayOptions {
  artistName?: string;
  year?: number;
  songCount?: number;
  duration?: number;
}

const AlbumRow = ({
  artistName,
  year,
  songCount,
  duration,
  coverUrl,
  showArtist = true,
  showYear = true,
  showTrackCount = true,
  ...props
}: AlbumRowProps) => {
  const accentColor = useImageAccentColor(coverUrl);

  return (
    <MediaRow
      {...props}
      coverUrl={coverUrl}
      stack={2}
      stackColor={accentColor}
      meta={[
        showArtist ? artistName : null,
        showYear ? year : null,
        showTrackCount && songCount ? formatCount(songCount, "song") : null,
        duration ? formatTotalDuration(duration) : null,
      ]}
    />
  );
};

export default React.memo(AlbumRow);
