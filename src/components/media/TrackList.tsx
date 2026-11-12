import React, { Fragment, useMemo } from "react";
import { toast } from "sonner";
import { AlbumIcon, ClockIcon, PauseIcon, PlayArrowIcon } from "../../constants/icons";
import useAudioVisualizerData from "../../hooks/useAudioVisualizerData";
import useVisualizerColor from "../../hooks/useVisualizerColor";
import { usePlaybackStore } from "../../store/playbackStore";
import type { SubsonicSong } from "../../types/subsonic";
import cn from "../../utils/cn";
import { addSongToQueue, queueSongNext } from "../../utils/playbackActions";
import { formatTime } from "../../utils/time";
import BackgroundAreaVisualizer from "../visualizer/BackgroundAreaVisualizer";
import MediaContextMenu from "./MediaContextMenu";
import type { MediaActions } from "./types";

export interface TrackListProps {
  songs: SubsonicSong[];
  onPlay: (song: SubsonicSong, index: number) => Promise<void> | void;
  numbering?: "track" | "position";
  showArtist?: boolean;
  showAlbum?: boolean;
  groupByDisc?: boolean;
  emptyMessage?: string;
  className?: string;
}

const reportError = (message: string) => (error: unknown) => {
  const description = error instanceof Error ? error.message : undefined;
  toast.error(message, description ? { description } : undefined);
};

const runSafely = (action: () => Promise<void> | void, message: string) => {
  try {
    const result = action();
    if (result instanceof Promise) void result.catch(reportError(message));
  } catch (error) {
    reportError(message)(error);
  }
};

const ROW_CELLS = cn(
  "[&>td]:py-2 [&>td]:pr-4 [&>td:first-child]:pl-2 [&>td:last-child]:pr-2",
  "[&>td]:transition-colors [&>td:first-child]:rounded-l-lg [&>td:last-child]:rounded-r-lg",
);

const RowVisualizer = () => {
  const data = useAudioVisualizerData({ ignoreVolume: true });
  const color = useVisualizerColor();
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-md">
      <BackgroundAreaVisualizer frequencyData={data} color={color} opacity={0.35} blur={1} />
    </div>
  );
};

interface TrackRowProps {
  song: SubsonicSong;
  number: number;
  isCurrent: boolean;
  showArtist: boolean;
  showAlbum: boolean;
  onPlay: () => void;
}

const TrackRow = React.memo(({ song, number, isCurrent, showArtist, showAlbum, onPlay }: TrackRowProps) => {
  const actions = useMemo<MediaActions>(() => ({
    onPlay,
    onPlayNext: () => runSafely(() => queueSongNext(song), "Unable to queue song next"),
    onAddToQueue: () => runSafely(() => addSongToQueue(song), "Unable to add song to queue"),
  }), [onPlay, song]);

  return (
    <MediaContextMenu actions={actions}>
      <tr
        tabIndex={0}
        onClick={onPlay}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onPlay();
          }
        }}
        aria-current={isCurrent || undefined}
        className={cn(
          "group relative cursor-pointer outline-none",
          ROW_CELLS,
          "hover:[&>td]:bg-surface2 focus-visible:[&>td]:bg-surface2",
          isCurrent && "[&>td]:bg-surface-tonal1 hover:[&>td]:bg-surface-tonal2 focus-visible:[&>td]:bg-surface-tonal2",
        )}
      >
        <td className={cn("text-center text-sm tabular-nums", isCurrent ? "text-primary0" : "text-text-grey")}>
          {isCurrent ? <RowVisualizer /> : null}
          <span className="relative group-hover:hidden">{number}</span>
          {isCurrent ?
            (<PauseIcon fontSize="small" className="relative hidden! align-middle text-text group-hover:inline-block!" />)
            : (<PlayArrowIcon fontSize="small" className="hidden! align-middle text-text group-hover:inline-block!" />)
          }
        </td>

        <td>
          <span className={cn("relative block truncate text-sm", isCurrent ? "text-primary0" : "text-text")}>
            {song.title}
          </span>
          {showArtist && song.artist ? (
            <span className="relative block truncate text-xs text-text-grey">{song.artist}</span>
          ) : null}
        </td>

        {showAlbum ? (
          <td className="text-sm text-text-grey"><span className="relative block truncate">{song.album}</span></td>
        ) : null}

        <td className="text-right text-sm tabular-nums text-text-grey">
          <span className="relative">{song.duration ? formatTime(song.duration) : "–"}</span>
        </td>
      </tr>
    </MediaContextMenu>
  );
});
TrackRow.displayName = "TrackRow";

const TrackList = ({
  songs,
  onPlay,
  numbering = "track",
  showArtist = true,
  showAlbum = false,
  groupByDisc = true,
  emptyMessage = "No songs.",
  className,
}: TrackListProps) => {
  const currentSongId = usePlaybackStore((state) => state.currentSong?.id);
  const columnCount = showAlbum ? 4 : 3;

  const hasMultipleDiscs = useMemo(
    () => groupByDisc && new Set(songs.map((song) => song.discNumber ?? 1)).size > 1,
    [groupByDisc, songs],
  );

  const playHandlers = useMemo(
    () => songs.map((song, index) => () => runSafely(() => onPlay(song, index), "Unable to play song")),
    [onPlay, songs],
  );

  return (
    <table className={cn("w-full table-fixed border-separate border-spacing-0", className)}>
      <thead>
        <tr className="text-left text-xs font-medium text-text-grey [&>th]:border-b [&>th]:border-surface3 [&>th]:pb-2 [&>th]:pr-4 [&>th]:font-medium [&>th:first-child]:pl-2 [&>th:last-child]:pr-2">
          <th scope="col" className="w-16 text-center">
            <span aria-hidden>#</span>
            <span className="sr-only">Track number</span>
          </th>
          <th scope="col">Title</th>
          {showAlbum ? <th scope="col" className="w-2/5">Album</th> : null}
          <th scope="col" className="w-16">
            <span className="flex justify-end" aria-hidden>
              <ClockIcon fontSize="inherit" className="text-base" />
            </span>
            <span className="sr-only">Duration</span>
          </th>
        </tr>
        <tr aria-hidden className="h-2" />
      </thead>

      <tbody>
        {songs.length === 0 ? (
          <tr>
            <td colSpan={columnCount} className="px-2 py-6 text-sm text-text-grey">{emptyMessage}</td>
          </tr>
        ) : songs.map((song, index) => {
          const disc = song.discNumber ?? 1;
          const startsDisc = hasMultipleDiscs && (index === 0 || (songs[index - 1].discNumber ?? 1) !== disc);
          return (
            <Fragment key={song.id ?? `${song.title}-${index}`}>
              {startsDisc ? (
                <tr>
                  <th
                    scope="colgroup"
                    colSpan={columnCount}
                    className={cn("px-2 pb-1 text-left text-sm font-semibold text-text-grey", index > 0 && "pt-4")}
                  >
                    <span className="flex items-center gap-2">
                      <AlbumIcon fontSize="small" />
                      Disc {disc}
                    </span>
                  </th>
                </tr>
              ) : null}
              <TrackRow
                song={song}
                number={numbering === "track" ? song.track ?? index + 1 : index + 1}
                isCurrent={song.id === currentSongId}
                showArtist={showArtist}
                showAlbum={showAlbum}
                onPlay={playHandlers[index]}
              />
            </Fragment>
          );
        })}
      </tbody>
    </table>
  );
};

export default TrackList;
