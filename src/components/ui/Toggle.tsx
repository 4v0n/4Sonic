import React from "react";
import cn from "../../utils/cn";

export interface ToggleProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline";
  size?: "sm" | "md" | "lg";
  pressed?: boolean;
  onPressedChange?: (pressed: boolean) => void;
}

const toggleVariants = (
  variant?: ToggleProps["variant"],
  size?: ToggleProps["size"],
  className?: string,
) => {
  const effectiveVariant = variant ?? "default";
  const effectiveSize = size ?? "md";

  const baseClasses =
    `inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors shadow
    hover:bg-(--surface2) data-[state=on]:bg-(--surface-tonal1) data-[state=on]:hover:bg-(--surface-tonal2) disabled:opacity-50
    cursor-pointer`;

  const variants: Record<NonNullable<ToggleProps["variant"]>, string> = {
    default: "bg-(--surface1)",
    outline: "bg-(--surface1) border border-(--surface4) hover:bg-(--surface2)",
  };

  const sizes: Record<NonNullable<ToggleProps["size"]>, string> = {
    sm: "h-9 px-2.5",
    md: "h-10 px-3",
    lg: "h-11 px-5",
  };

  return cn(baseClasses, variants[effectiveVariant], sizes[effectiveSize], className);
};

const Toggle = React.forwardRef<HTMLButtonElement, ToggleProps>(
  ({ className, variant, size, pressed, onPressedChange, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={pressed}
        data-state={pressed ? "on" : "off"}
        onClick={() => onPressedChange?.(!pressed)}
        className={toggleVariants(variant, size, className)}
        {...props}
      />
    );
  },
);
Toggle.displayName = "Toggle";

export default Toggle;