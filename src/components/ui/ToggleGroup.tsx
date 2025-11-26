import React from "react";
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import cn from "../../utils/cn";
import type { ToggleProps } from "./Toggle";

export type ToggleGroupProps = React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Root> & {
  variant?: ToggleProps["variant"];
  size?: ToggleProps["size"];
};

type ToggleGroupStyleContextType = {
  variant?: ToggleProps["variant"];
  size?: ToggleProps["size"];
};

const ToggleGroupStyleContext = React.createContext<ToggleGroupStyleContextType | null>(null);

const toggleItemClasses = (variant: ToggleProps["variant"], size: ToggleProps["size"], className?: string) => {
  const effectiveVariant = variant ?? "default";
  const effectiveSize = size ?? "md";

  const baseClasses =
    `inline-flex items-center justify-center text-sm font-medium transition-colors shadow
    hover:bg-(--surface2) data-[state=on]:bg-(--surface-tonal1) data-[state=on]:hover:bg-(--surface-tonal2)
    disabled:opacity-50 cursor-pointer`;

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

const ToggleGroup = React.forwardRef<React.ElementRef<typeof ToggleGroupPrimitive.Root>, ToggleGroupProps>(
  ({ className, variant, size, ...props }, ref) => (
    <ToggleGroupStyleContext.Provider value={{ variant, size }}>
      <ToggleGroupPrimitive.Root
        ref={ref}
        className={cn("inline-flex items-center justify-center gap-1", className)}
        {...props}
      />
    </ToggleGroupStyleContext.Provider>
  ),
);
ToggleGroup.displayName = ToggleGroupPrimitive.Root.displayName;

export interface ToggleGroupItemProps
  extends Omit<React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item>, "asChild"> {
  variant?: ToggleProps["variant"];
  size?: ToggleProps["size"];
}

const ToggleGroupItem = React.forwardRef<React.ElementRef<typeof ToggleGroupPrimitive.Item>, ToggleGroupItemProps>(
  ({ className, variant, size, children, ...props }, ref) => {
    const styleContext = React.useContext(ToggleGroupStyleContext);
    const effectiveVariant = variant ?? styleContext?.variant;
    const effectiveSize = size ?? styleContext?.size;

    return (
      <ToggleGroupPrimitive.Item
        ref={ref}
        className={cn(
          "rounded-none first:rounded-l-md last:rounded-r-md",
          toggleItemClasses(effectiveVariant, effectiveSize, className),
        )}
        {...props}
      >
        {children}
      </ToggleGroupPrimitive.Item>
    );
  },
);
ToggleGroupItem.displayName = ToggleGroupPrimitive.Item.displayName;

export { ToggleGroup, ToggleGroupItem };
