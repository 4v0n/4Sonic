import React from "react";

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
    small: "p-1",
    medium: "p-2",
    large: "p-3",
  };

  return (
    <button
      {...props}
      className={`rounded-full ${sizeClasses[size]} ${className}`}
    >
      {children}
    </button>
  );
};

export default IconButton;