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
    const hasTextLikeChild = childArray.some(
      (child) => {
        if (typeof child === "string" || typeof child === "number") return true;
        if (React.isValidElement(child)) {
          const grandChildren = React.Children.toArray(child.props?.children);
          return grandChildren.some((grandChild) => typeof grandChild === "string" || typeof grandChild === "number");
        }
        return false;
      },
    );
    const iconOnly = childArray.length === 1 && !hasTextLikeChild;

    const Comp = isSlot ? Slot : "button";

    const base =
      "cursor-pointer rounded-full transition-colors flex items-center justify-center gap-2 shadow hover:shadow-md align-middle";

    const sizeClasses = {
      small: iconOnly ? "w-6 h-6" : "h-6 px-2 text-sm gap-1",
      medium: iconOnly ? "w-8 h-8" : "h-8 px-2 text-base gap-1",
      large: iconOnly ? "w-10 h-10" : "h-10 px-3 text-lg gap-1",
    };

    const iconScale = {
      small: "[&>svg]:w-4 [&>svg]:h-4 [&>img]:w-4 [&>img]:h-4",
      medium: "[&>svg]:w-5 [&>svg]:h-5 [&>img]:w-5 [&>img]:h-5",
      large: "[&>svg]:w-6 [&>svg]:h-6 [&>img]:w-6 [&>img]:h-6",
    };

    const variantClasses = {
      default: "bg-(--surface0) hover:bg-(--surface1)",
      primary: "bg-(--primary0) hover:bg-(--primary1)",
      secondary: "bg-(--surface-tonal0) hover:bg-(--surface-tonal1)",
      outline: "bg-transparent border border-(--text-grey) hover:bg-(--surface1) shadow-none",
      ghost: "bg-transparent hover:bg-(--surface1) shadow-none",
      destructive: "bg-(--danger0) hover:bg-(--danger1)",
      link: "bg-transparent underline underline-offset-4 text-(--text) hover:text-(--text) px-0 h-auto shadow-none hover:shadow-none rounded-none",
    } as const;

    const classNames = cn(
      base,
      sizeClasses[size],
      iconScale[size],
      variantClasses[variant],
      className,
      iconOnly ? "rounded-full" : "",
      props.disabled ? "opacity-50 cursor-not-allowed shadow-none" : "",
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
