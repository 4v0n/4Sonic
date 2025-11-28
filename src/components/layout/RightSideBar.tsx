import type { MouseEvent } from "react";
import { CloseIcon, QueueMusicRoundedIcon } from "../../constants/icons";
import Button from "../ui/Button";
import type { RightSidebarView } from "../../store/rightSidebarStore";

interface RightSideBarProps {
  width: number;
  view: RightSidebarView;
  isOpen: boolean;
  isResizing: boolean;
  onResizeStart: (event: MouseEvent<HTMLDivElement>) => void;
  onClose: () => void;
}

export const RightSidebarContent = ({ view }: { view: RightSidebarView }) => {
  if (view === "queue") {
    return (
      <div className="space-y-3">
        <div className="text-sm text-(--text-grey)">Up Next</div>
        {/* Queue content can be plugged in here */}
        <div className="rounded-lg border border-(--surface1) p-4 text-(--text-grey)">
          Queue items will appear here.
        </div>
      </div>
    );
  }

  return null;
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
