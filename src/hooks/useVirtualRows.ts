import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";

interface VirtualRowsOptions {
  rowCount: number;
  rowHeight: number;
  gap: number;
  overscan: number;
  scrollElement: HTMLElement | null;
  listElement: HTMLElement | null;
  initialScrollTop: number;
  listOffsetRef: { current: number };
}

interface VirtualRows {
  start: number;
  end: number;
  totalHeight: number;
  offsetTop: number;
}

const useVirtualRows = ({
  rowCount,
  rowHeight,
  gap,
  overscan,
  scrollElement,
  listElement,
  initialScrollTop,
  listOffsetRef,
}: VirtualRowsOptions): VirtualRows => {
  const stride = rowHeight + gap;
  const strideRef = useRef(stride);
  strideRef.current = stride;

  const [viewport, setViewport] = useState(() => {
    const height = scrollElement?.clientHeight ?? window.innerHeight;
    return {
      firstRow: Math.max(0, Math.floor((initialScrollTop - listOffsetRef.current) / stride)),
      rows: Math.ceil(height / stride) + 1,
    };
  });

  const update = useCallback(() => {
    if (!scrollElement || !listElement) return;
    const listOffset = listElement.getBoundingClientRect().top
      - scrollElement.getBoundingClientRect().top
      + scrollElement.scrollTop;
    listOffsetRef.current = listOffset;

    const firstRow = Math.max(0, Math.floor((scrollElement.scrollTop - listOffset) / strideRef.current));
    const rows = Math.ceil(scrollElement.clientHeight / strideRef.current) + 1;
    setViewport((current) => (
      current.firstRow === firstRow && current.rows === rows ? current : { firstRow, rows }
    ));
  }, [listElement, listOffsetRef, scrollElement]);

  useEffect(() => {
    if (!scrollElement) return;
    const handleScroll = () => flushSync(update);
    scrollElement.addEventListener("scroll", handleScroll, { passive: true });
    const resizeObserver = new ResizeObserver(() => update());
    resizeObserver.observe(scrollElement);
    return () => {
      scrollElement.removeEventListener("scroll", handleScroll);
      resizeObserver.disconnect();
    };
  }, [scrollElement, update]);

  useEffect(() => {
    update();
  }, [rowCount, stride, update]);

  const start = Math.max(0, Math.min(viewport.firstRow, rowCount - 1) - overscan);
  const end = Math.max(start, Math.min(rowCount, viewport.firstRow + viewport.rows + overscan));

  return {
    start,
    end,
    totalHeight: rowCount > 0 ? rowCount * stride - gap : 0,
    offsetTop: start * stride,
  };
};

export default useVirtualRows;
