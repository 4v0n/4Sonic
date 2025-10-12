import React from "react";
import cn from "../../utils/cn";

interface SpinnerProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  color?: string;
  label?: string;
  showLabel?: boolean;
  className?: string;
  labelClassName?: string;
}

const Spinner: React.FC<SpinnerProps> = ({
  size = "md",
  color = "text-primary-0",
  label = "Loading...",
  showLabel = false,
  className = "",
  labelClassName = "ml-2 text-sm text-text-grey",
}) => {
  const sizeClasses = {
    xs: "w-3 h-3",
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-10 h-10",
    xl: "w-14 h-14",
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("flex items-center", className)}
    >
      <svg
        className={`animate-spin ${sizeClasses[size]} ${color} block shrink-0`}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>

      {label && !showLabel && <span className="sr-only">{label}</span>}
      {label && showLabel && <span className={labelClassName}>{label}</span>}
    </div>
  );
};


export default Spinner;