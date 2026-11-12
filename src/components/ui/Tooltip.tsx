import React from "react";
import { Tooltip as TooltipPrimitive } from "radix-ui";
import cn from "../../utils/cn";

export const TooltipProvider = ({ children }: { children: React.ReactNode }) => (
  <TooltipPrimitive.Provider delayDuration={400} skipDelayDuration={300}>
    {children}
  </TooltipPrimitive.Provider>
);

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  sideOffset?: number;
  disabled?: boolean;
  className?: string;
}

const Tooltip = ({
  content,
  children,
  side = "top",
  align = "center",
  sideOffset = 8,
  disabled = false,
  className,
}: TooltipProps) => {
  if (disabled || content === undefined || content === null || content === "") {
    return children;
  }

  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          align={align}
          sideOffset={sideOffset}
          collisionPadding={8}
          className={cn(
            "z-50 max-w-xs select-none whitespace-nowrap rounded-md bg-surface2 px-2 py-1 text-sm text-text shadow-sm drop-shadow-lg",
            "animate-tooltip-in motion-reduce:animate-none",
            className,
          )}
        >
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
};

export default Tooltip;
