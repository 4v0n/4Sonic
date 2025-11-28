import React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import cn from "../../utils/cn";

export type SwitchSize = "sm" | "md" | "lg";

type SwitchProps = React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root> & {
  size?: SwitchSize;
  thumbClassName?: string;
};

const sizeStyles: Record<SwitchSize, { track: string; thumb: string; start: string; checked: string }> = {
  sm: {
    track: "h-5 w-9",
    thumb: "h-[14px] w-[14px]",
    start: "left-[4px]",
    checked: "data-[state=checked]:left-[18px]",
  },
  md: {
    track: "h-6 w-11",
    thumb: "h-[18px] w-[18px]",
    start: "left-[4px]",
    checked: "data-[state=checked]:left-[22px]",
  },
  lg: {
    track: "h-7 w-14",
    thumb: "h-[22px] w-[22px]",
    start: "left-[4px]",
    checked: "data-[state=checked]:left-[30px]",
  },
};

const Switch = React.forwardRef<React.ElementRef<typeof SwitchPrimitive.Root>, SwitchProps>(
  ({ className, thumbClassName, size = "md", disabled, ...props }, ref) => {
    const styles = sizeStyles[size];

    return (
      <SwitchPrimitive.Root
        ref={ref}
        disabled={disabled}
        className={cn(
          "peer relative inline-flex shrink-0 cursor-pointer items-center rounded-full border transition-colors duration-200",
          "bg-(--danger0) border-(--surface2)",
          "data-[state=checked]:bg-(--success0)",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--success1) focus-visible:ring-offset-2 focus-visible:ring-offset-(--surface0)",
          "disabled:cursor-not-allowed disabled:opacity-50",
          styles.track,
          className,
        )}
        {...props}
      >
        <SwitchPrimitive.Thumb
          className={cn(
            "pointer-events-none absolute top-1/2 -translate-y-1/2 rounded-full bg-(--text) shadow-[0_1px_4px_rgba(0,0,0,0.18)] transition-all duration-200",
            styles.thumb,
            styles.start,
            styles.checked,
            thumbClassName,
          )}
        />
      </SwitchPrimitive.Root>
    );
  },
);

Switch.displayName = SwitchPrimitive.Root.displayName;

export default Switch;
