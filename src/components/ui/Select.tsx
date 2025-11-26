import React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { ArrowDropDownIcon, CheckIcon } from "../../constants/icons";
import cn from "../../utils/cn";

type PrimitiveOption = string | number;
type ObjectOption = { label: React.ReactNode; value: string; disabled?: boolean };
type AnyOption = PrimitiveOption | ObjectOption;

function toObjectOption(opt: AnyOption): ObjectOption {
  if (typeof opt === "string" || typeof opt === "number") {
    return { label: String(opt), value: String(opt) };
  }
  return opt;
}

export interface SelectProps {
  options: AnyOption[];
  placeholder?: string;
  size?: "small" | "medium" | "large";
  icon?: React.ReactNode;
  fullWidth?: boolean;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

const triggerSizes = {
  small: "h-8 text-sm px-3",
  medium: "h-10 text-base px-4",
  large: "h-12 text-lg px-5",
} as const;

const Select = ({
  options,
  placeholder = "Select an option",
  size = "medium",
  icon = <ArrowDropDownIcon />,
  className = "",
  fullWidth = true,
  value,
  defaultValue,
  onValueChange,
  disabled,
}: SelectProps) => {
  const normalized = options.map(toObjectOption);
  const wrapper = cn("relative", fullWidth ? "w-full" : "inline-block", className);

  return (
    <div className={wrapper}>
      <SelectPrimitive.Root value={value} defaultValue={defaultValue} onValueChange={onValueChange} disabled={disabled}>
        <SelectPrimitive.Trigger
          className={cn(
            "inline-flex items-center justify-between rounded-full border border-transparent bg-(--surface0) shadow-sm",
            "hover:bg-(--surface1) transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
            "cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
            triggerSizes[size],
            fullWidth ? "w-full" : "w-auto",
          )}
        >
          <SelectPrimitive.Value placeholder={placeholder} />
          <SelectPrimitive.Icon className="ml-2 flex items-center text-(--text-grey)">
            <span className="[&>svg]:w-5 [&>svg]:h-5 [&>img]:w-5 [&>img]:h-5 opacity-70">{icon}</span>
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>

        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            className="z-50 min-w-[10rem] overflow-hidden rounded-lg border border-(--surface2) bg-(--surface1) shadow-lg"
            position="popper"
          >
            <SelectPrimitive.Viewport className="p-1">
              {normalized.map((opt) => (
                <SelectPrimitive.Item
                  key={opt.value}
                  value={opt.value}
                  disabled={opt.disabled}
                  className={cn(
                    "relative flex cursor-pointer select-none items-center gap-2 rounded-md px-3 py-2 text-sm text-(--text-grey)",
                    "focus:bg-(--surface2) focus:text-(--text) focus:outline-none data-[state=checked]:text-(--text)",
                    "hover:bg-(--surface2) hover:text-(--text)",
                    "data-[disabled]:opacity-50 data-[disabled]:pointer-events-none",
                  )}
                >
                  <SelectPrimitive.ItemText>{opt.label}</SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator className="absolute right-3">
                    <CheckIcon className="h-4 w-4" />
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    </div>
  );
};

export default Select;
