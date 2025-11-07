import React from "react";
import { CheckIcon } from "../../constants/icons";
import cn from "../../utils/cn";

export interface CheckboxProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(
  ({ className, checked, onCheckedChange, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        role="checkbox"
        aria-checked={checked}
        data-state={checked ? "checked" : "unchecked"}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          "peer h-4 w-4 shrink-0 rounded-sm border border-(--text) cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 text-(--success1)",
          className,
        )}
        {...props}
      >
        <div className={cn("flex items-center justify-center h-full w-full", checked ? "opacity-100" : "opacity-0")}>
          <CheckIcon className="h-4 w-4 rounded-sm" />
        </div>
      </button>
    );
  },
);

export default Checkbox;