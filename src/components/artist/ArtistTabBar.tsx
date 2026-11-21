import React from "react";
import cn from "../../utils/cn";

export interface ArtistTab<T extends string> {
  value: T;
  label: string;
}

interface ArtistTabBarProps<T extends string> {
  tabs: ArtistTab<T>[];
  value: T;
  onChange: (value: T) => void;
  trailing?: React.ReactNode;
}

function ArtistTabBar<T extends string>({ tabs, value, onChange, trailing }: ArtistTabBarProps<T>) {
  return (
    <div className="sticky -top-4 z-20 sm:-top-6 flex h-14 items-center gap-4 border-b border-surface3/60 bg-surface0 px-4 sm:px-9">
      <div role="tablist" aria-label="Artist sections" className="flex h-full min-w-0 flex-1 items-stretch gap-8 overflow-x-auto">
        {tabs.map((tab) => {
          const active = tab.value === value;
          return (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(tab.value)}
              className={cn(
                "relative shrink-0 cursor-pointer whitespace-nowrap text-sm font-medium outline-none transition-colors",
                "focus-visible:text-text",
                active ? "text-text" : "text-text-grey hover:text-text",
              )}
            >
              {tab.label}
              <span
                aria-hidden
                className={cn(
                  "absolute inset-x-[-0.5rem] bottom-0 h-0.5 rounded-full bg-primary0 transition-opacity",
                  active ? "opacity-100" : "opacity-0",
                )}
              />
            </button>
          );
        })}
      </div>
      {trailing ? <div className="flex shrink-0 items-center">{trailing}</div> : null}
    </div>
  );
}

export default ArtistTabBar;
