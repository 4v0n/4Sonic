import React from "react";
import { Slot } from "@radix-ui/react-slot";
import cn from "../../utils/cn";

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  children?: React.ReactNode;
  size?: "small" | "medium" | "large";
  variant?:
    | "default"
    | "primary"
    | "secondary"
    | "outline"
    | "ghost"
    | "destructive"
    | "link";
}

const Button = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      children,
      className = "",
      size = "medium",
      variant = "default",
      asChild = false,
      ...props
    },
    ref,
  ) => {
    const isSlot = asChild && React.isValidElement(children);
    const childArray = React.Children.toArray(children);
    const isTextLike = (child: React.ReactNode) => {
      if (typeof child === "string" || typeof child === "number") return true;
      if (React.isValidElement(child)) {
        const grandChildren = React.Children.toArray((child.props as { children?: React.ReactNode })?.children);
        return grandChildren.some((grandChild) => typeof grandChild === "string" || typeof grandChild === "number");
      }
      return false;
    };
    const hasTextLikeChild = childArray.some(isTextLike);
    const iconOnly = childArray.length === 1 && !hasTextLikeChild;
    const leadingIcon = !iconOnly && childArray.length > 1 && !isTextLike(childArray[0]);

    const Comp = isSlot ? Slot : "button";

    const base = [
      "relative inline-flex shrink-0 items-center justify-center whitespace-nowrap align-middle",
      "rounded-full text-sm font-medium cursor-pointer select-none outline-none",
      "transition-colors duration-150",
      "before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:bg-current before:opacity-0 before:transition-opacity",
      "hover:before:opacity-16 focus-visible:before:opacity-16 active:before:opacity-24",
      "focus-visible:ring-3 focus-visible:ring-primary0/40",
      "disabled:pointer-events-none disabled:opacity-50",
    ].join(" ");

    const sizeClasses = {
      small: iconOnly ? "w-6 h-6" : `h-6 text-xs gap-1.5 ${leadingIcon ? "pl-1 pr-3" : "px-3"}`,
      medium: iconOnly ? "w-8 h-8" : `h-8 gap-2 ${leadingIcon ? "pl-1.5 pr-4" : "px-4"}`,
      large: iconOnly ? "w-10 h-10" : `h-10 gap-2 ${leadingIcon ? "pl-2 pr-6" : "px-6"}`,
    };

    const iconScale = {
      small: "[&>svg]:w-4 [&>svg]:h-4 [&>img]:w-4 [&>img]:h-4",
      medium: "[&>svg]:w-5 [&>svg]:h-5 [&>img]:w-5 [&>img]:h-5",
      large: "[&>svg]:w-6 [&>svg]:h-6 [&>img]:w-6 [&>img]:h-6",
    };

    const variantClasses = {
      default: "bg-surface2 text-text",
      primary: "bg-primary0 text-light hover:bg-primary1 active:bg-primary2 before:hidden",
      secondary: "bg-surface-tonal2 text-primary5",
      outline: "bg-transparent text-text border border-surface3",
      ghost: "bg-transparent text-text",
      destructive: "bg-danger1 text-light",
      link: "bg-transparent text-text px-0 h-auto rounded-none underline-offset-4 hover:underline before:hidden",
    } as const;

    const classNames = cn(
      base,
      sizeClasses[size],
      iconScale[size],
      variantClasses[variant],
      className,
    );

    const normalizedChildren = childArray.map((child, index) => {
      if (typeof child === "string" || typeof child === "number") {
        return (
          <span key={`btn-child-${index}`} className="flex items-center">
            {child}
          </span>
        );
      }
      return child;
    });

    return (
      <Comp ref={ref} {...props} className={classNames} data-icon-only={iconOnly || undefined}>
        {normalizedChildren}
      </Comp>
    );
  },
);

Button.displayName = "Button";

export default Button;
