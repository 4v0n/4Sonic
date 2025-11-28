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
  leftIcon?: React.ReactNode;
  fullWidth?: boolean;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

const triggerSizes = {
  small: {
    height: "h-8",
    text: "text-sm",
    padding: "pl-3 pr-2.5",
    icon: "[&>svg]:h-4 [&>svg]:w-4 [&>img]:h-4 [&>img]:w-4",
  },
  medium: {
    height: "h-10",
    text: "text-base",
    padding: "pl-4 pr-3",
    icon: "[&>svg]:h-5 [&>svg]:w-5 [&>img]:h-5 [&>img]:w-5",
  },
  large: {
    height: "h-12",
    text: "text-lg",
    padding: "pl-5 pr-4",
    icon: "[&>svg]:h-5 [&>svg]:w-5 [&>img]:h-5 [&>img]:w-5",
  },
} as const;

const Select = ({
  options,
  placeholder = "Select an option",
  size = "medium",
  icon = <ArrowDropDownIcon />,
  leftIcon,
  className = "",
  fullWidth = false,
  value,
  defaultValue,
  onValueChange,
  disabled,
}: SelectProps) => {
  const normalized = React.useMemo(() => options.map(toObjectOption), [options]);
  const sizeStyles = triggerSizes[size];
  const iconClasses = cn("flex shrink-0 items-center text-(--text-grey)", sizeStyles.icon);

  const measureRef = React.useRef<HTMLDivElement>(null);
  const [calculatedWidth, setCalculatedWidth] = React.useState<number>();

  React.useLayoutEffect(() => {
    const measureEl = measureRef.current;
    if (!measureEl) return;
    const widths = Array.from(measureEl.children).map((child) => (child as HTMLElement).getBoundingClientRect().width);
    if (!widths.length) return;
    setCalculatedWidth(Math.ceil(Math.max(...widths)));
  }, [normalized, size, leftIcon, icon, placeholder]);

  const wrapper = cn("relative", fullWidth ? "w-full" : "inline-block", className);
  const triggerWidthStyle = !fullWidth && calculatedWidth ? { minWidth: `${calculatedWidth}px` } : undefined;

  return (
    <div className={wrapper}>
      <div ref={measureRef} className="absolute left-0 top-0 -z-10 flex flex-col opacity-0 pointer-events-none">
        {[...normalized, { label: placeholder, value: "__placeholder" }].map((opt) => (
          <div
            key={opt.value}
            className={cn(
              "inline-flex w-fit items-center gap-2 whitespace-nowrap rounded-full border border-transparent bg-(--surface0)",
              sizeStyles.height,
              sizeStyles.text,
              sizeStyles.padding,
            )}
          >
            {leftIcon ? <span className={iconClasses}>{leftIcon}</span> : null}
            <span>{opt.label}</span>
            <span className={cn(iconClasses, "ml-auto")}>{icon}</span>
          </div>
        ))}
      </div>

      <SelectPrimitive.Root value={value} defaultValue={defaultValue} onValueChange={onValueChange} disabled={disabled}>
        <SelectPrimitive.Trigger
          className={cn(
            "inline-flex items-center gap-2 rounded-full border border-transparent bg-(--surface0) shadow-sm",
            "hover:bg-(--surface1) transition-colors outline-none whitespace-nowrap",
            "cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
            sizeStyles.height,
            sizeStyles.text,
            sizeStyles.padding,
            fullWidth ? "w-full justify-between" : "w-fit",
          )}
          style={triggerWidthStyle}
        >
          {leftIcon ? <span className={iconClasses}>{leftIcon}</span> : null}
          <SelectPrimitive.Value placeholder={placeholder} />
          <SelectPrimitive.Icon className={cn(iconClasses, "ml-auto")}>
            <span className="opacity-70">{icon}</span>
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>

        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            className="z-50 overflow-hidden rounded-lg border border-(--surface2) bg-(--surface1) shadow-lg"
            position="popper"
            style={calculatedWidth ? { minWidth: `${calculatedWidth}px` } : undefined}
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
