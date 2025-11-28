import { Outlet } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import TopBar from "./TopBar";
import LeftSideBar from "./LeftSideBar";
import BottomBar from "./BottomBar";
import RightSideBar from "./RightSideBar";
import { useLibraryBootstrap } from "../../hooks/useLibrary";
import { useRightSidebarStore } from "../../store/rightSidebarStore";
import Sonner from "../ui/Sonner";

const DEFAULT_WIDTH = 256;
const ICON_ONLY_WIDTH = 72;
const ICON_SNAP_THRESHOLD = 120;
const MIN_MAIN_CONTENT = 600;
const MAX_WIDTH_RATIO = 0.45;
const RIGHT_DEFAULT_WIDTH = 320;
const RIGHT_MIN_WIDTH = 240;
const RIGHT_MAX_WIDTH_RATIO = 0.4;
const LEFT_WIDTH_STORAGE_KEY = "layout:left-sidebar-width";

const getStoredLeftWidth = () => {
  if (typeof window === "undefined") return DEFAULT_WIDTH;
  const stored = window.localStorage.getItem(LEFT_WIDTH_STORAGE_KEY);
  const parsed = stored ? Number(stored) : NaN;
  return Number.isFinite(parsed) ? parsed : DEFAULT_WIDTH;
};

const AppShell = () => {
  useLibraryBootstrap();

  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : MIN_MAIN_CONTENT + DEFAULT_WIDTH + RIGHT_DEFAULT_WIDTH,
  );
  const [sidebarWidth, setSidebarWidth] = useState(getStoredLeftWidth);
  const [isResizing, setIsResizing] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(sidebarWidth);
  const rafRef = useRef<number | null>(null);
  const nextSidebarXRef = useRef<number | null>(null);
  const [isRightResizing, setIsRightResizing] = useState(false);
  const rightStartXRef = useRef(0);
  const rightStartWidthRef = useRef(RIGHT_DEFAULT_WIDTH);
  const rightRafRef = useRef<number | null>(null);
  const rightNextXRef = useRef<number | null>(null);

  const {
    isOpen: isRightOpen,
    width: rightWidth,
    view: rightView,
    setWidth: setRightWidth,
    close: closeRightSidebar,
  } = useRightSidebarStore();
  const isRightCompact = viewportWidth < 1100;
  const effectiveRightOpen = isRightOpen && !isRightCompact;

  const clampWidth = useMemo(() => {
    return (value: number) => {
      const occupiedRight = effectiveRightOpen ? rightWidth : 0;
      const maxWidth = Math.max(
        ICON_ONLY_WIDTH,
        Math.min(viewportWidth * MAX_WIDTH_RATIO, viewportWidth - occupiedRight - MIN_MAIN_CONTENT),
      );
      const boundedMax = Number.isFinite(maxWidth) && maxWidth > 0 ? maxWidth : DEFAULT_WIDTH;
      return Math.min(Math.max(value, ICON_ONLY_WIDTH), boundedMax);
    };
  }, [effectiveRightOpen, rightWidth, viewportWidth]);

  const clampRightWidth = useMemo(() => {
    return (value: number) => {
      const maxByMain = viewportWidth - sidebarWidth - MIN_MAIN_CONTENT;
      const maxByRatio = viewportWidth * RIGHT_MAX_WIDTH_RATIO;
      const maxWidth = Math.min(maxByMain, maxByRatio);
      const effectiveMax = Number.isFinite(maxWidth) ? Math.max(0, maxWidth) : RIGHT_DEFAULT_WIDTH;
      const clampedMax = Math.max(Math.min(effectiveMax, viewportWidth), 0);
      const lowerBound = Math.min(RIGHT_MIN_WIDTH, clampedMax);
      return Math.min(Math.max(value, lowerBound), clampedMax);
    };
  }, [sidebarWidth, viewportWidth]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    setSidebarWidth((current) => clampWidth(current));
  }, [clampWidth]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(LEFT_WIDTH_STORAGE_KEY, String(sidebarWidth));
  }, [sidebarWidth]);

  const handleResizeStart = (event: React.MouseEvent<HTMLDivElement>) => {
    setIsResizing(true);
    startXRef.current = event.clientX;
    startWidthRef.current = sidebarWidth;
    document.body.style.userSelect = "none";
  };

  const handleRightResizeStart = (event: React.MouseEvent<HTMLDivElement>) => {
    setIsRightResizing(true);
    rightStartXRef.current = event.clientX;
    rightStartWidthRef.current = rightWidth;
    document.body.style.userSelect = "none";
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (event: MouseEvent) => {
      nextSidebarXRef.current = event.clientX;
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const clientX = nextSidebarXRef.current ?? startXRef.current;
        nextSidebarXRef.current = null;
        const delta = clientX - startXRef.current;
        setSidebarWidth(clampWidth(startWidthRef.current + delta));
      });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      nextSidebarXRef.current = null;
      setSidebarWidth((current) => {
        if (current <= ICON_SNAP_THRESHOLD) return ICON_ONLY_WIDTH;
        return clampWidth(current);
      });
      document.body.style.userSelect = "";
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      nextSidebarXRef.current = null;
      document.body.style.userSelect = "";
    };
  }, [clampWidth, isResizing]);

  useEffect(() => {
    if (!isRightResizing) return;

    const handleMouseMove = (event: MouseEvent) => {
      rightNextXRef.current = event.clientX;
      if (rightRafRef.current) return;
      rightRafRef.current = requestAnimationFrame(() => {
        rightRafRef.current = null;
        const clientX = rightNextXRef.current ?? rightStartXRef.current;
        rightNextXRef.current = null;
        const delta = rightStartXRef.current - clientX;
        setRightWidth(clampRightWidth(rightStartWidthRef.current + delta));
      });
    };

    const handleMouseUp = () => {
      setIsRightResizing(false);
      if (rightRafRef.current) {
        cancelAnimationFrame(rightRafRef.current);
        rightRafRef.current = null;
      }
      rightNextXRef.current = null;
      setRightWidth((current) => clampRightWidth(current));
      document.body.style.userSelect = "";
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      if (rightRafRef.current) {
        cancelAnimationFrame(rightRafRef.current);
        rightRafRef.current = null;
      }
      rightNextXRef.current = null;
      document.body.style.userSelect = "";
    };
  }, [clampRightWidth, isRightResizing, setRightWidth]);

  useEffect(() => {
    if (isRightOpen) {
      setRightWidth((current) => clampRightWidth(current));
    }
  }, [clampRightWidth, isRightOpen, setRightWidth]);

  useEffect(() => {
    setRightWidth((current) => clampRightWidth(current));
  }, [clampRightWidth, setRightWidth]);

  const isIconOnly = sidebarWidth <= ICON_SNAP_THRESHOLD;
  const rightSidebarWidth = effectiveRightOpen ? rightWidth : 0;

  return (
    <div className="flex flex-col h-screen font-sans bg-(--surface0) text-(--text)">
      <TopBar />
      <Sonner />
      <div className="flex flex-1 overflow-hidden">
        <LeftSideBar
          width={sidebarWidth}
          isIconOnly={isIconOnly}
          isResizing={isResizing}
          onResizeStart={handleResizeStart}
        />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
        {!isRightCompact && (
          <RightSideBar
            width={rightSidebarWidth}
            view={rightView}
            isOpen={effectiveRightOpen}
            isResizing={isRightResizing}
            onResizeStart={handleRightResizeStart}
            onClose={closeRightSidebar}
          />
        )}
      </div>
      <BottomBar isRightCompact={isRightCompact} />
    </div>
  );
};

export default AppShell;
