import React, { useState } from "react";
import { Kbd } from "./Kbd";
import cn from "../../utils/cn";

const formatKeybind = (e: KeyboardEvent): string => {
  const parts: string[] = [];
  if (e.metaKey) parts.push("⌘");
  if (e.ctrlKey) parts.push("ctrl");
  if (e.altKey) parts.push("alt");
  if (e.shiftKey) parts.push("shift");

  let key = "";

  if (e.code.startsWith("Key")) {
    key = e.code.replace("Key", "").toLowerCase();
  } else if (e.code.startsWith("Digit")) {
    key = e.code.replace("Digit", "");
  } else {
    key = e.key.toLowerCase();
  }

  if (!["meta", "control", "alt", "shift"].includes(key)) {
    parts.push(key.length === 1 ? key.toUpperCase() : key);
  }

  return parts.join(" + ");
};

export interface KeybindInputProps {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  valueName?: string;
}

export const KeybindInput: React.FC<KeybindInputProps> = ({ value, onValueChange, className, valueName }) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const formatted = formatKeybind(e.nativeEvent);
    if (formatted) {
      onValueChange(formatted);
    }
  };

  return (
    <button
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      onKeyDown={handleKeyDown}
      className={cn(
        `flex h-10 w-full min-w-0 items-center justify-between px-3 py-2 sm:min-w-[200px] rounded-full
        bg-(--surface1) text-sm hover:bg-(--surface2) transition-colors cursor-pointer focus:cursor-auto
        focus:bg-(--surface-tonal1) outline-none focus:outline-none shadow`,
        className,
      )}
    >
      <span>
        {valueName ? valueName : "Set Keybind"}
      </span>
      {value ? <Kbd>{value}</Kbd> : (isFocused && <span className="text-xs">Press any key...</span>)}
    </button>
  );
};
