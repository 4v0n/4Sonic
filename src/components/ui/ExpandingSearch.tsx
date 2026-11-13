import React, { useEffect, useRef, useState } from "react";
import { CloseIcon, SearchIcon } from "../../constants/icons";
import cn from "../../utils/cn";
import { Kbd } from "./Kbd";

const IS_MAC = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "defaultValue" | "onChange" | "size">;

export interface ExpandingSearchProps extends InputProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  onSearch?: (value: string) => void;
  expandedWidthClassName?: string;
  enableShortcut?: boolean;
  className?: string;
}

const ExpandingSearch = React.forwardRef<HTMLInputElement, ExpandingSearchProps>(
  (
    {
      value: controlledValue,
      defaultValue = "",
      onValueChange,
      onSearch,
      expandedWidthClassName = "w-72",
      enableShortcut = true,
      placeholder = "Search",
      className,
      onFocus,
      onBlur,
      onKeyDown,
      ...props
    },
    ref,
  ) => {
    const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
    const value = controlledValue ?? uncontrolledValue;
    const [hovered, setHovered] = useState(false);
    const [focused, setFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement | null>(null);

    const expanded = hovered || focused || value.length > 0;

    const setRefs = (node: HTMLInputElement | null) => {
      inputRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    };

    const setValue = (next: string) => {
      if (controlledValue === undefined) setUncontrolledValue(next);
      onValueChange?.(next);
    };

    useEffect(() => {
      if (!enableShortcut) return;
      const handleKeyDown = (event: KeyboardEvent) => {
        if ((IS_MAC ? event.metaKey : event.ctrlKey) && event.key.toLowerCase() === "k") {
          event.preventDefault();
          inputRef.current?.focus();
          inputRef.current?.select();
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [enableShortcut]);

    const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.target === inputRef.current) return;
      event.preventDefault();
      inputRef.current?.focus();
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
      onKeyDown?.(event);
      if (event.defaultPrevented) return;
      if (event.key === "Escape") {
        if (value) setValue("");
        else inputRef.current?.blur();
      } else if (event.key === "Enter") {
        onSearch?.(value);
      }
    };

    const showShortcutHint = enableShortcut && expanded && !focused && !value;

    return (
      <div
        role="search"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onMouseDown={handleMouseDown}
        data-expanded={expanded || undefined}
        data-focused={focused || undefined}
        className={cn(
          "group relative flex h-10 shrink-0 items-center overflow-hidden rounded-full",
          "cursor-pointer bg-transparent",
          "transition-[width,background-color,box-shadow] duration-300 ease-[cubic-bezier(0.34,1.4,0.64,1)]",
          "motion-reduce:transition-none",
          expanded ? cn(expandedWidthClassName, "bg-surface1 shadow") : "w-10 hover:bg-surface2",
          focused && "cursor-text bg-surface-tonal1 ring-2 ring-primary0/40",
          className,
        )}
      >
        <span
          aria-hidden
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center transition-[color,transform] duration-300",
            "[&>svg]:h-5 [&>svg]:w-5",
            focused ? "text-primary0" : expanded ? "text-text" : "text-text-grey group-hover:text-text",
          )}
        >
          <SearchIcon />
        </span>
        <input
          ref={setRefs}
          type="text"
          role="searchbox"
          aria-label={placeholder}
          placeholder={placeholder}
          value={value}
          spellCheck={false}
          autoComplete="off"
          onChange={(event) => setValue(event.target.value)}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          onKeyDown={handleKeyDown}
          className={cn(
            "min-w-0 flex-1 bg-transparent pr-3 text-sm text-text placeholder:text-text-grey",
            "border-none outline-none caret-primary0",
            "transition-opacity duration-200",
            expanded ? "opacity-100 delay-100" : "pointer-events-none opacity-0",
          )}
          {...props}
        />
        {showShortcutHint ? (
          <Kbd className="mr-3 shrink-0 animate-tooltip-in border-surface4 text-text-grey">
            {IS_MAC ? "⌘" : "Ctrl"} K
          </Kbd>
        ) : null}
        {value ? (
          <button
            type="button"
            aria-label="Clear search"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              setValue("");
              inputRef.current?.focus();
            }}
            className={cn(
              "mr-1.5 flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full",
              "text-text-grey outline-none transition-colors hover:bg-surface3 hover:text-text focus-visible:bg-surface3",
              "[&>svg]:h-4 [&>svg]:w-4",
            )}
          >
            <CloseIcon />
          </button>
        ) : null}
      </div>
    );
  },
);

ExpandingSearch.displayName = "ExpandingSearch";

export default ExpandingSearch;
