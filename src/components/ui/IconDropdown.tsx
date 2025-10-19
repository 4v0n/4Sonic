import React, { useEffect, useRef, useState } from "react";
import Button from "./Button";

interface DropdownOption {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  isDivider?: false;
};

interface DropdownDivider {
  isDivider: true;
}

export type MenuOption = DropdownOption | DropdownDivider;

export type DropdownPlacement =
  | "bottom-left"
  | "bottom-right"
  | "bottom-center"
  | "top-left"
  | "top-right"
  | "top-center";

interface IconDropdownProps {
  triggerContent: React.ReactNode;
  options: MenuOption[];
  buttonAriaLabel: string;
  buttonClassName?: string;
  dropdownPanelClassName?: string;
  dropdownPlacement?: DropdownPlacement;
};

const IconDropdown = ({
  triggerContent,
  options,
  buttonAriaLabel,
  buttonClassName = "",
  dropdownPanelClassName = "",
  dropdownPlacement = "bottom-center",
}: IconDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleOptionClick = (optionOnClick: () => void) => {
    optionOnClick();
    setIsOpen(false);
  };

  const getPlacementClasses = (): string => {
    switch (dropdownPlacement) {
    case "bottom-left":
      return "origin-top-left left-0 mt-2 top-full";
    case "bottom-right":
      return "origin-top-right right-0 mt-2 top-full";
    case "bottom-center":
      return "origin-top left-1/2 -translate-x-1/2 mt-2 top-full";
    case "top-left":
      return "origin-bottom-left left-0 mb-2 bottom-full";
    case "top-right":
      return "origin-bottom-right right-0 mb-2 bottom-full";
    case "top-center":
      return "origin-bottom left-1/2 -translate-x-1/2 mb-2 bottom-full";
    default:
      return "origin-top-right right-0 mt-2 top-full";
    }
  };

  const placementClasses = getPlacementClasses();

  return (
    <div className="relative inline-block text-left" ref={wrapperRef}>
      <Button
        onClick={() => setIsOpen(!isOpen)}
        aria-label={buttonAriaLabel}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className={buttonClassName}
      >
        {triggerContent}
      </Button>

      {isOpen && (
        <div
          className={`
            absolute w-56 rounded-md shadow-lg ring-1 ring-opacity-5 z-50 ${placementClasses} ${dropdownPanelClassName}
            bg-(--surface1) ring-(--surface2)
          `}
          role="menu"
          aria-orientation="vertical"
          aria-labelledby={buttonAriaLabel}
        >
          <div className="py-1" role="none">
            {options.map((option, index) => {
              if (option.isDivider) {
                return (
                  <div
                    key={`divider-${index}`}
                    className="my-1 h-px bg-(--surface2)"
                    role="separator"
                  />
                );
              } else {
                const itemOption = option as DropdownOption;
                return (
                  <button
                    key={itemOption.label}
                    onClick={() => handleOptionClick(itemOption.onClick)}
                    className="flex cursor-pointer transition-colors items-center w-full text-left px-4 py-2 text-sm text-(--text-grey) hover:bg-(--surface2) hover:text-(--text)"
                    role="menuitem"
                  >
                    {itemOption.icon && <span className="mr-3 h-5 w-5">{itemOption.icon}</span>}
                    {itemOption.label}
                  </button>
                );
              }
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default IconDropdown;