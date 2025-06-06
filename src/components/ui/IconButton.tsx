import React from "react";
import { twMerge } from "tailwind-merge";

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  size?: "small" | "medium" | "large";
};

const IconButton = ({
  children,
  className = "",
  size = "medium",
  ...props
}: IconButtonProps) => {
  const sizeClasses = {
    small: "w-6 h-6 flex items-center justify-center",
    medium: "w-8 h-8 flex items-center justify-center",
    large: "w-10 h-10 flex items-center justify-center",
  };

  const classNames = twMerge(
    "cursor-pointer rounded-full hover:bg-(--surface1) hover:shadow-md transition-colors",
    className,
  );


  return (
    <button
      {...props}
      className={` ${sizeClasses[size]} ${classNames}`}
    >
      {children}
    </button>
  );
};

export default IconButton;