import React from "react";
import * as ContextMenuPrimitive from "@radix-ui/react-context-menu";
import { ArrowForwardIcon } from "../../constants/icons";
import cn from "../../utils/cn";

export const ContextMenu = ContextMenuPrimitive.Root;

export const ContextMenuTrigger = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <ContextMenuPrimitive.Trigger ref={ref} className={className} {...props} />
));
ContextMenuTrigger.displayName = ContextMenuPrimitive.Trigger.displayName;

export const ContextMenuPortal = ContextMenuPrimitive.Portal;

export const ContextMenuContent = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <ContextMenuPortal>
    <ContextMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "min-w-[12rem] rounded-md shadow-lg border border-(--surface2)",
        "bg-(--surface1) py-1 text-(--text-grey)",
        "animate-in fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2",
        className,
      )}
      {...props}
    />
  </ContextMenuPortal>
));
ContextMenuContent.displayName = ContextMenuPrimitive.Content.displayName;

export const ContextMenuItem = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Item> & { inset?: boolean; icon?: React.ReactNode }
>(({ className, inset, icon, children, ...props }, ref) => (
  <ContextMenuPrimitive.Item
    ref={ref}
    className={cn(
      "flex cursor-pointer transition-colors items-center gap-3 w-full text-left px-4 py-2 text-sm",
      "text-(--text-grey) hover:bg-(--surface2) hover:text-(--text)",
      "focus:bg-(--surface2) outline-none focus:outline-none",
      "disabled:pointer-events-none disabled:opacity-50",
      inset && "pl-8",
      className,
    )}
    {...props}
  >
    {icon && (
      <span className="flex h-5 w-5 shrink-0 items-center justify-center text-(--text-grey) [&>svg]:h-5 [&>svg]:w-5">
        {icon}
      </span>
    )}
    {children}
  </ContextMenuPrimitive.Item>
));
ContextMenuItem.displayName = ContextMenuPrimitive.Item.displayName;

export const ContextMenuSeparator = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <ContextMenuPrimitive.Separator
    ref={ref}
    className={cn("my-1 h-px bg-(--surface2)", className)}
    {...props}
  />
));
ContextMenuSeparator.displayName = ContextMenuPrimitive.Separator.displayName;

export const ContextMenuSub = ContextMenuPrimitive.Sub;

export const ContextMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.SubTrigger> & { inset?: boolean }
>(({ className, inset, children, ...props }, ref) => (
  <ContextMenuPrimitive.SubTrigger
    ref={ref}
    className={cn(
      "relative flex cursor-pointer select-none items-center rounded-sm px-4 py-2 text-sm text-(--text-grey)",
      "transition-colors hover:bg-(--surface2) focus:bg-(--surface2) hover:text-(--text) focus:text-(--text)",
      "outline-none focus:outline-none",
      inset && "pl-8",
      className,
    )}
    {...props}
  >
    {children}
    <ArrowForwardIcon fontSize="inherit" className="ml-auto" />
  </ContextMenuPrimitive.SubTrigger>
));
ContextMenuSubTrigger.displayName = ContextMenuPrimitive.SubTrigger.displayName;

export const ContextMenuSubContent = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.SubContent>
>(({ className, sideOffset = 6, alignOffset = -4, ...props }, ref) => (
  <ContextMenuPrimitive.SubContent
    ref={ref}
    sideOffset={sideOffset}
    alignOffset={alignOffset}
    className={cn("min-w-[12rem] rounded-md shadow-lg bg-(--surface1) py-1 border border-(--surface2)", className)}
    {...props}
  />
));
ContextMenuSubContent.displayName = ContextMenuPrimitive.SubContent.displayName;
