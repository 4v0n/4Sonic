import React from "react";
import { PlayArrowIcon, PlaylistAddIcon, QueuePlayNextIcon } from "../../constants/icons";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "../ui/ContextMenu";
import { hasMediaActions, type MediaActions } from "./types";

interface MediaContextMenuProps {
  actions?: MediaActions;
  /** Must be a single element that can receive a ref (used as the trigger via `asChild`). */
  children: React.ReactElement;
}

/** Wraps a tile/row in the play / play next / add to queue context menu, if any actions exist. */
const MediaContextMenu = ({ actions, children }: MediaContextMenuProps) => {
  if (!hasMediaActions(actions)) {
    return children;
  }

  const { onPlay, onPlayNext, onAddToQueue } = actions;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        {onPlay ? (
          <ContextMenuItem icon={<PlayArrowIcon />} onSelect={onPlay}>
            Play
          </ContextMenuItem>
        ) : null}
        {onPlayNext ? (
          <ContextMenuItem icon={<QueuePlayNextIcon />} onSelect={onPlayNext}>
            Play next
          </ContextMenuItem>
        ) : null}
        {onAddToQueue ? (
          <ContextMenuItem icon={<PlaylistAddIcon />} onSelect={onAddToQueue}>
            Add to queue
          </ContextMenuItem>
        ) : null}
      </ContextMenuContent>
    </ContextMenu>
  );
};

export default MediaContextMenu;
