import React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { CheckIcon } from "../../constants/icons";
import cn from "../../utils/cn";

export interface CheckboxProps
  extends Omit<React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>, "checked" | "onCheckedChange"> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<React.ElementRef<typeof CheckboxPrimitive.Root>, CheckboxProps>(
  ({ className, checked, onCheckedChange, ...props }, ref) => {
    return (
      <CheckboxPrimitive.Root
        ref={ref}
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
        className={cn(
          "peer h-4 w-4 shrink-0 rounded-sm border border-(--text) cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 text-(--success1)",
          className,
        )}
        {...props}
      >
        <CheckboxPrimitive.Indicator
          forceMount
          className="flex items-center justify-center h-full w-full opacity-100 data-[state=unchecked]:opacity-0 transition-opacity"
        >
          <CheckIcon className="h-4 w-4 rounded-sm" />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
    );
  },
);

export default Checkbox;
