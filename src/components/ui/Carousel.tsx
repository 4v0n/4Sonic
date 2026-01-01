import React, { useCallback, useEffect, useRef, useState } from "react";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { ArrowBackIcon, ArrowForwardIcon } from "../../constants/icons";
import cn from "../../utils/cn";
import Button from "./Button";

export interface CarouselItem {
  id?: React.Key;
  children: React.ReactNode;
}

interface CarouselProps {
  items: CarouselItem[];
  className?: string;
  ariaLabel?: string;
  itemWidth?: number;
}

const SCROLL_PADDING = 16;

const Carousel: React.FC<CarouselProps> = ({
  items,
  className,
  ariaLabel = "Carousel",
  itemWidth = 240,
}) => {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const node = viewportRef.current;
    if (!node) return;

    const { scrollLeft, scrollWidth, clientWidth } = node;
    setCanScrollLeft(scrollLeft > SCROLL_PADDING);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - SCROLL_PADDING);
  }, []);

  const handleNavigate = useCallback((direction: "previous" | "next") => {
    const node = viewportRef.current;
    if (!node) return;

    const step = Math.max(itemWidth, node.clientWidth * 0.9);
    const delta = direction === "next" ? step : -step;
    node.scrollBy({ left: delta, behavior: "smooth" });
  }, [itemWidth]);

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return;

    updateScrollState();
    const handleScroll = () => updateScrollState();

    node.addEventListener("scroll", handleScroll, { passive: true });

    const resizeObserver = new ResizeObserver(() => updateScrollState());
    resizeObserver.observe(node);

    return () => {
      node.removeEventListener("scroll", handleScroll);
      resizeObserver.disconnect();
    };
  }, [updateScrollState]);

  return (
    <div className={cn("relative group/carousel", className)}>
      <ScrollAreaPrimitive.Root type="scroll" className="w-full">
        <ScrollAreaPrimitive.Viewport
          ref={viewportRef}
          aria-label={ariaLabel}
          className="w-full overflow-x-auto overflow-y-hidden pb-3"
        >
          <div className="flex gap-4 pr-3 pl-1 snap-x snap-mandatory">
            {items.map((item, index) => (
              <div
                key={item.id ?? index}
                className="flex-shrink-0 snap-start w-[180px] sm:w-[200px] lg:w-[220px]"
              >
                {item.children}
              </div>
            ))}
          </div>
        </ScrollAreaPrimitive.Viewport>
        <ScrollAreaPrimitive.Scrollbar
          orientation="horizontal"
          className="flex h-2 select-none touch-none items-center px-4"
        >
          <ScrollAreaPrimitive.Thumb className="relative flex-1 rounded-full bg-(--surface3) transition hover:bg-(--surface4)" />
        </ScrollAreaPrimitive.Scrollbar>
        <ScrollAreaPrimitive.Corner />
      </ScrollAreaPrimitive.Root>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-(--surface0) to-transparent opacity-0 transition-opacity duration-200 group-hover/carousel:opacity-90 group-focus-within/carousel:opacity-90"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-(--surface0) to-transparent opacity-0 transition-opacity duration-200 group-hover/carousel:opacity-90 group-focus-within/carousel:opacity-90"
      />

      <div className="absolute inset-y-0 left-0 flex items-center pl-2 opacity-0 transition-opacity duration-200 group-hover/carousel:opacity-100 group-focus-within/carousel:opacity-100 pointer-events-none group-hover/carousel:pointer-events-auto group-focus-within/carousel:pointer-events-auto">
        <Button
          aria-label="Previous items"
          size="large"
          variant="ghost"
          disabled={!canScrollLeft}
          onClick={() => handleNavigate("previous")}
          className="pointer-events-auto shadow-md bg-(--surface1) hover:bg-(--surface2)"
        >
          <ArrowBackIcon fontSize="medium" />
        </Button>
      </div>
      <div className="absolute inset-y-0 right-0 flex items-center pr-2 opacity-0 transition-opacity duration-200 group-hover/carousel:opacity-100 group-focus-within/carousel:opacity-100 pointer-events-none group-hover/carousel:pointer-events-auto group-focus-within/carousel:pointer-events-auto">
        <Button
          aria-label="Next items"
          size="large"
          variant="ghost"
          disabled={!canScrollRight}
          onClick={() => handleNavigate("next")}
          className="pointer-events-auto shadow-md bg-(--surface1) hover:bg-(--surface2)"
        >
          <ArrowForwardIcon fontSize="medium" />
        </Button>
      </div>
    </div>
  );
};

export default Carousel;
