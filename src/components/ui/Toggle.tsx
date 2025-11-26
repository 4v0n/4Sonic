import React from "react";
import * as TogglePrimitive from "@radix-ui/react-toggle";
import cn from "../../utils/cn";

export interface ToggleProps extends React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root> {
  variant?: "default" | "outline";
  size?: "sm" | "md" | "lg";
}

const toggleVariants = (variant: ToggleProps["variant"], size: ToggleProps["size"], className?: string) => {
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

const Toggle = React.forwardRef<React.ElementRef<typeof TogglePrimitive.Root>, ToggleProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <TogglePrimitive.Root
        ref={ref}
        className={toggleVariants(variant, size, className)}
        {...props}
      />
    );
  },
);
Toggle.displayName = TogglePrimitive.Root.displayName;

export default Toggle;
