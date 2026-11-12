import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useState } from "react";
import { CloseIcon, MaximizeIcon, MinimizeIcon, RestoreIcon } from "../../constants/icons";
import cn from "../../utils/cn";

export const IS_DESKTOP = isTauri();

const useIsMaximized = () => {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    if (!IS_DESKTOP) return;
    const appWindow = getCurrentWindow();
    let disposed = false;
    let unlisten: (() => void) | undefined;

    const sync = () => {
      void appWindow.isMaximized().then((value) => {
        if (!disposed) setMaximized(value);
      });
    };

    sync();
    void appWindow.onResized(sync).then((stop) => {
      if (disposed) stop();
      else unlisten = stop;
    });

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);

  return maximized;
};

const CONTROL_CLASS = cn(
  "flex h-full w-12 cursor-pointer items-center justify-center text-text outline-none transition-colors",
  "hover:bg-surface3 focus-visible:bg-surface3 active:bg-surface4",
);

const WindowControls = ({ className }: { className?: string }) => {
  const maximized = useIsMaximized();
  if (!IS_DESKTOP) return null;

  const appWindow = getCurrentWindow();

  return (
    <div className={cn("flex h-full items-stretch", className)}>
      <button type="button" aria-label="Minimise" title="Minimise" className={CONTROL_CLASS} onClick={() => void appWindow.minimize()}>
        <MinimizeIcon fontSize="small" />
      </button>
      <button
        type="button"
        aria-label={maximized ? "Restore" : "Maximise"}
        title={maximized ? "Restore" : "Maximise"}
        className={CONTROL_CLASS}
        onClick={() => void appWindow.toggleMaximize()}
      >
        {maximized ? <RestoreIcon sx={{ fontSize: 16 }} /> : <MaximizeIcon sx={{ fontSize: 18 }} />}
      </button>
      <button
        type="button"
        aria-label="Close"
        title="Close"
        className={cn(CONTROL_CLASS, "hover:bg-danger1 hover:text-light focus-visible:bg-danger1 focus-visible:text-light active:bg-danger2")}
        onClick={() => void appWindow.close()}
      >
        <CloseIcon fontSize="small" />
      </button>
    </div>
  );
};

export const WindowFrameBar = () => {
  if (!IS_DESKTOP) return null;
  return (
    <div data-tauri-drag-region className="fixed inset-x-0 top-0 z-50 flex h-10 justify-end">
      <WindowControls />
    </div>
  );
};

export default WindowControls;
