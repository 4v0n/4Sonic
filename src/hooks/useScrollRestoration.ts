import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

const positions = new Map<string, number>();
const MAX_ENTRIES = 200;

const RESTORE_TIMEOUT_MS = 4000;

const SCROLL_KEYS = new Set([
  "ArrowUp",
  "ArrowDown",
  "PageUp",
  "PageDown",
  "Home",
  "End",
  " ",
]);

const savePosition = (key: string, value: number) => {
  positions.delete(key);
  positions.set(key, value);
  if (positions.size > MAX_ENTRIES) {
    const oldest = positions.keys().next().value;
    if (oldest !== undefined) positions.delete(oldest);
  }
};

const useScrollRestoration = (container: HTMLElement | null) => {
  const location = useLocation();
  const navigationType = useNavigationType();
  const entryKey = `${location.key}:${location.pathname}`;
  const keyRef = useRef(entryKey);
  const restoringRef = useRef(false);

  useEffect(() => {
    if (!container) return;
    const handleScroll = () => {
      if (restoringRef.current) return;
      savePosition(keyRef.current, container.scrollTop);
    };
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [container]);

  useLayoutEffect(() => {
    keyRef.current = entryKey;
    if (!container) return;

    const target = navigationType === "POP" ? positions.get(entryKey) : undefined;
    if (!target) {
      restoringRef.current = false;
      container.scrollTop = 0;
      return;
    }

    restoringRef.current = true;
    const key = entryKey;
    const startedAt = performance.now();
    let frame = 0;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (SCROLL_KEYS.has(event.key)) stop();
    };

    function stop() {
      if (!restoringRef.current) return;
      restoringRef.current = false;
      cancelAnimationFrame(frame);
      container!.removeEventListener("wheel", stop);
      container!.removeEventListener("touchmove", stop);
      container!.removeEventListener("pointerdown", stop);
      window.removeEventListener("keydown", handleKeyDown);
      savePosition(key, container!.scrollTop);
    }

    const tick = () => {
      const maxScroll = container.scrollHeight - container.clientHeight;
      container.scrollTop = Math.min(target, Math.max(0, maxScroll));
      if (maxScroll >= target || performance.now() - startedAt > RESTORE_TIMEOUT_MS) {
        stop();
        return;
      }
      frame = requestAnimationFrame(tick);
    };

    container.addEventListener("wheel", stop, { passive: true });
    container.addEventListener("touchmove", stop, { passive: true });
    container.addEventListener("pointerdown", stop);
    window.addEventListener("keydown", handleKeyDown);
    tick();

    return stop;
  }, [container, entryKey, navigationType]);
};

export const useRestoredScrollTop = (): number => {
  const location = useLocation();
  const navigationType = useNavigationType();
  if (navigationType !== "POP") return 0;
  return positions.get(`${location.key}:${location.pathname}`) ?? 0;
};

export default useScrollRestoration;
