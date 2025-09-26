import React, { forwardRef } from "react";
import { twMerge } from "tailwind-merge";
import { ArrowDropDownIcon } from "../../constants/icons";

type PrimitiveOption = string | number;
type ObjectOption = { label: React.ReactNode; value: string; disabled?: boolean };
type AnyOption = PrimitiveOption | ObjectOption;

function toObjectOption(opt: AnyOption): ObjectOption {
  if (typeof opt === "string" || typeof opt === "number") {
    return { label: String(opt), value: String(opt) };
  }
  return opt;
}

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  /** Options can be strings/numbers or {label, value, disabled} objects */
  options: AnyOption[];
  /** Optional placeholder shown when no value is selected */
  placeholder?: string;
  /** Control sizing like your Button */
  size?: "small" | "medium" | "large";
  /** Replace the dropdown icon if desired */
  icon?: React.ReactNode;
  /** Full width helper */
  fullWidth?: boolean;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      options,
      placeholder = "Select an option",
      size = "medium",
      icon = <ArrowDropDownIcon />,
      className = "",
      fullWidth = true,
      value,
      defaultValue,
      ...props
    },
    ref,
  ) => {
    const sizeClasses = {
      small: "h-8 text-sm pl-3 pr-8",
      medium: "h-10 text-base pl-4 pr-9",
      large: "h-12 text-lg pl-5 pr-10",
    } as const;

    const base =
      "appearance-none cursor-pointer rounded-full border shadow-sm bg-(--surface0) hover:bg-(--surface1) " +
      "transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2 " +
      "border-transparent w-full";

    const wrapper = twMerge(
      "relative",
      fullWidth ? "w-full" : "inline-block",
      className,
    );

    // Decide if we should render a placeholder <option>
    const hasValue =
      value !== undefined
        ? String(value).length > 0
        : defaultValue !== undefined
          ? String(defaultValue).length > 0
          : false;

    const normalized = options.map(toObjectOption);

    return (
      <div className={wrapper}>
        <select
          ref={ref}
          value={value}
          defaultValue={defaultValue}
          className={twMerge(base, sizeClasses[size])}
          {...props}
        >
          {placeholder && !hasValue && (
            <option value="" disabled hidden>
              {placeholder}
            </option>
          )}
          {normalized.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* End adornment icon */}
        <span
          aria-hidden="true"
          className={twMerge(
            "pointer-events-none absolute inset-y-0 right-2 flex items-center justify-center",
            size === "small" ? "pr-1.5" : size === "large" ? "pr-3" : "pr-2",
          )}
        >
          {/* Scale icon with text size via utility selectors */}
          <span className="[&>svg]:w-5 [&>svg]:h-5 [&>img]:w-5 [&>img]:h-5 opacity-70">
            {icon}
          </span>
        </span>
      </div>
    );
  },
);

Select.displayName = "Select";

export default Select;
