import type { MouseEvent } from "react";
import { CloseIcon, QueueMusicRoundedIcon } from "../../constants/icons";
import Button from "../ui/Button";
import type { RightSidebarView } from "../../store/rightSidebarStore";
import { usePlaybackStore } from "../../store/playbackStore";

interface RightSideBarProps {
  width: number;
  view: RightSidebarView;
  isOpen: boolean;
  isResizing: boolean;
  onResizeStart: (event: MouseEvent<HTMLDivElement>) => void;
  onClose: () => void;
}

export const RightSidebarContent = ({ view }: { view: RightSidebarView }) => {
  const currentSong = usePlaybackStore((state) => state.currentSong);
  const coverArtUrl = usePlaybackStore((state) => state.coverArtUrl);
  const position = usePlaybackStore((state) => state.position);
  const duration = usePlaybackStore((state) => state.duration);
  const queue = usePlaybackStore((state) => state.queue);
  const queueOrder = usePlaybackStore((state) => state.queueOrder);
  const queuePosition = usePlaybackStore((state) => state.queuePosition);
  const playFromQueue = usePlaybackStore((state) => state.playFromQueue);

  const formatTime = (value: number) => {
    if (!Number.isFinite(value) || value < 0) return "0:00";
    const mins = Math.floor(value / 60);
    const secs = Math.floor(value % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const nowPlaying = (
    <div className="space-y-2">
      <div className="text-sm text-(--text-grey)">Now Playing</div>
      <div className="flex gap-3 rounded-xl border border-(--surface2) bg-(--surface1) p-3">
        <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg border border-(--surface2) bg-(--surface2)">
          {coverArtUrl ? (
            <img src={coverArtUrl} alt={currentSong?.title ?? "Cover"} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-(--surface2)" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate">{currentSong?.title ?? "Nothing playing"}</p>
          <p className="text-xs text-(--text-grey) truncate">{currentSong?.artist ?? "Start a song to see details"}</p>
          <p className="text-[11px] text-(--text-grey)">
            {formatTime(position)} / {formatTime(duration)}
          </p>
        </div>
      </div>
    </div>
  );

  if (view === "queue") {
    const orderedQueue = queueOrder
      .map((queueIndex, orderIndex) => {
        const item = queue[queueIndex];
        if (!item) return null;
        return { item, orderIndex };
      })
      .filter(Boolean) as { item: (typeof queue)[number]; orderIndex: number }[];

    const upcoming = queuePosition >= 0
      ? orderedQueue.slice(queuePosition + 1)
      : orderedQueue;

    return (
      <div className="space-y-3">
        {nowPlaying}
        <div className="text-sm text-(--text-grey)">Up Next</div>
        {upcoming.length === 0 ? (
          <div className="rounded-lg border border-(--surface1) p-4 text-(--text-grey)">
            No more tracks in the queue.
          </div>
        ) : (
          <div className="space-y-2">
            {upcoming.map(({ item, orderIndex }) => (
              <button
                key={`${item.id}-${orderIndex}`}
                className="w-full rounded-lg border border-(--surface1) bg-(--surface0) px-3 py-2 text-left transition hover:border-(--surface2) hover:bg-(--surface1)"
                onClick={() => playFromQueue(orderIndex)}
              >
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 overflow-hidden rounded-md border border-(--surface2) bg-(--surface1)">
                    {item.coverArtUrl ? (
                      <img src={item.coverArtUrl} alt={item.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full bg-(--surface2)" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-(--text)">{item.title}</p>
                    <p className="truncate text-xs text-(--text-grey)">{item.artist ?? item.album}</p>
                  </div>
                  <span className="text-xs tabular-nums text-(--text-grey)">{formatTime(item.duration ?? 0)}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return nowPlaying;
};

const RightSideBar = ({ width, view, isOpen, isResizing, onResizeStart, onClose }: RightSideBarProps) => {
  return (
    <aside
      className={`
        relative flex-shrink-0 flex flex-col border-l border-(--surface1) bg-(--surface0) overflow-hidden
        ${isResizing ? "transition-none" : "transition-[width,opacity] duration-200 ease-in-out"}
        ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}
      `}
      style={{ width }}
      aria-hidden={!isOpen}
    >
      <div
        className={`
          absolute top-0 left-0 h-full w-1 cursor-col-resize
          ${isResizing ? "bg-(--surface2)" : "bg-transparent hover:bg-(--surface2)"}
        `}
        onMouseDown={onResizeStart}
        role="separator"
        aria-label="Resize right sidebar"
      />

      <div className="flex items-center justify-between px-4 py-3 sticky top-0 bg-(--surface0) z-10 border-b border-(--surface1)">
        <div className="flex items-center gap-2 text-lg font-semibold">
          {view === "queue" && <QueueMusicRoundedIcon fontSize="small" />}
          <span className="truncate capitalize">{view}</span>
        </div>
        <Button
          variant="ghost"
          size="small"
          aria-label="Close right sidebar"
          onClick={onClose}
        >
          <CloseIcon fontSize="small" />
        </Button>
      </div>

      <div className="p-4 overflow-y-auto flex-1">
        <RightSidebarContent view={view} />
      </div>
    </aside>
  );
};

export default RightSideBar;
