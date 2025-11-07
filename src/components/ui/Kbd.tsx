import React from "react";
import cn from "../../utils/cn";

export const Kbd = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <kbd
        ref={ref}
        className={cn(
          `pointer-events-none inline-flex h-5 select-none items-center gap-1
          rounded border border-(--text-grey) bg-(--surface0) px-1.5 font-mono text-[10px] font-medium opacity-100`,
          className,
        )}
        {...props}
      >
        {children}
      </kbd>
    );
  },
);
Kbd.displayName = "Kbd";
