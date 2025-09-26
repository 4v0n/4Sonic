import React from "react";
import { twMerge } from "tailwind-merge";

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  size?: "small" | "medium" | "large";
};

const Button = ({
  children,
  className = "",
  size = "medium",
  ...props
}: IconButtonProps) => {
  const childArray = React.Children.toArray(children);
  const hasText = childArray.some(
    (c) =>
      typeof c === "string"
        ? c.trim().length > 0
        : typeof c === "number",
  );
  const iconOnly = !hasText;

  const base = `cursor-pointer rounded-full bg-(--surface0) hover:bg-(--surface1)
    hover:shadow-md transition-colors flex items-center justify-center gap-2`;

  const sizeClasses = {
    small: iconOnly ? "w-6 h-6" : "h-6 px-2 text-sm gap-1",
    medium: iconOnly ? "w-8 h-8" : "h-8 px-2 text-base gap-1",
    large: iconOnly ? "w-10 h-10" : "h-10 px-2 text-lg gap-1",
  };

  const iconScale = {
    small: "[&>svg]:w-4 [&>svg]:h-4 [&>img]:w-4 [&>img]:h-4",
    medium: "[&>svg]:w-5 [&>svg]:h-5 [&>img]:w-5 [&>img]:h-5",
    large: "[&>svg]:w-6 [&>svg]:h-6 [&>img]:w-6 [&>img]:h-6",
  };

  const classNames = twMerge(base, sizeClasses[size], iconScale[size], className, props.disabled ? "opacity-50 cursor-not-allowed" : "");


  return (
    <button
      {...props}
      className={`${classNames}`}
    >
      {children}
    </button>
  );
};

export default Button;