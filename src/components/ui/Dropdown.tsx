import React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import Button from "./Button";
import cn from "../../utils/cn";

export type MenuOption =
  | {
      label: string;
      onClick: () => void;
      icon?: React.ReactNode;
      isDivider?: false;
    }
  | {
      isDivider: true;
    };

export type DropdownPlacement = "bottom-left" | "bottom-right" | "bottom-center" | "top-left" | "top-right" | "top-center";

interface DropdownProps {
  triggerContent: React.ReactNode;
  options: MenuOption[];
  buttonAriaLabel: string;
  buttonClassName?: string;
  dropdownPanelClassName?: string;
  dropdownPlacement?: DropdownPlacement;
  buttonProps?: Omit<React.ComponentProps<typeof Button>, "children" | "asChild" | "className">;
}

const placementToSideAlign = (placement: DropdownPlacement): { side: "top" | "bottom"; align: "start" | "center" | "end" } => {
  switch (placement) {
  case "bottom-left":
    return { side: "bottom", align: "start" };
  case "bottom-right":
    return { side: "bottom", align: "end" };
  case "bottom-center":
    return { side: "bottom", align: "center" };
  case "top-left":
    return { side: "top", align: "start" };
  case "top-right":
    return { side: "top", align: "end" };
  case "top-center":
  default:
    return { side: "top", align: "center" };
  }
};

const Dropdown = ({
  triggerContent,
  options,
  buttonAriaLabel,
  buttonClassName = "",
  dropdownPanelClassName = "",
  dropdownPlacement = "bottom-center",
  buttonProps,
}: DropdownProps) => {
  const { side, align } = placementToSideAlign(dropdownPlacement);

  return (
    <DropdownMenuPrimitive.Root>
      <DropdownMenuPrimitive.Trigger asChild aria-label={buttonAriaLabel}>
        <Button className={buttonClassName} aria-haspopup="menu" {...buttonProps}>
          {triggerContent}
        </Button>
      </DropdownMenuPrimitive.Trigger>
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          side={side}
          align={align}
          sideOffset={8}
          alignOffset={0}
          className={cn(
            "min-w-[12rem] rounded-md shadow-lg border border-(--surface2) z-50",
            "bg-(--surface1) py-1 text-(--text-grey)",
            "animate-in fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2",
            dropdownPanelClassName,
          )}
        >
          {options.map((option, index) => {
            if (option.isDivider) {
              return <DropdownMenuPrimitive.Separator key={`divider-${index}`} className="my-1 h-px bg-(--surface2)" />;
            }
            return (
              <DropdownMenuPrimitive.Item
                key={option.label}
                onSelect={(event) => {
                  event.preventDefault();
                  option.onClick();
                }}
                className={cn(
                  "group flex cursor-pointer transition-colors items-center gap-3 w-full text-left px-4 py-2 text-sm",
                  "text-(--text-grey) hover:bg-(--surface2) hover:text-(--text)",
                  "focus-visible:outline-none focus:bg-(--surface2)",
                  "disabled:pointer-events-none disabled:opacity-50",
                )}
              >
                {option.icon && (
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center text-(--text-grey) [&>svg]:h-5 [&>svg]:w-5 transition-colors group-hover:text-(--text) group-focus:text-(--text)">
                    {option.icon}
                  </span>
                )}
                {option.label}
              </DropdownMenuPrimitive.Item>
            );
          })}
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  );
};

export default Dropdown;
