import React from "react";
import { formatAlbumCount } from "./format";
import { MediaRow, type MediaRowProps } from "./Row";

export interface ArtistRowProps extends Omit<MediaRowProps, "title" | "meta" | "stack" | "stackColor"> {
  name: string;
  albumCount?: number;
}

const ArtistRow = ({ name, albumCount, ...props }: ArtistRowProps) => (
  <MediaRow {...props} title={name} meta={[formatAlbumCount(albumCount)]} />
);

export default React.memo(ArtistRow);
