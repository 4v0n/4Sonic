import React from "react";
import { Slot } from "@radix-ui/react-slot";
import cn from "../../utils/cn";

type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">;

export interface TextInputProps extends InputProps {
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  fieldSize?: "small" | "medium" | "large";
  fullWidth?: boolean;
  inputClassName?: string;
  asChild?: boolean;
  children?: React.ReactNode;
}

const sizeClasses = {
  small: "h-9 text-sm px-3 gap-2",
  medium: "h-10 text-sm px-3 py-2 gap-2",
  large: "h-12 text-base px-4 gap-3",
} as const;

const iconClasses = "[&>svg]:h-5 [&>svg]:w-5 [&>img]:h-5 [&>img]:w-5 opacity-70";

const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(
  (
    {
      startIcon,
      endIcon,
      fieldSize = "medium",
      fullWidth = true,
      className,
      inputClassName,
      asChild = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const InputComponent = asChild ? Slot : "input";
    const inputRef = React.useRef<HTMLInputElement | null>(null);

    const setRefs = (node: HTMLInputElement | null) => {
      inputRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    };

    const handleActivate = (event: React.MouseEvent<HTMLDivElement>) => {
      if (disabled) return;
      if (inputRef.current) {
        inputRef.current.focus();
        // Prevent text selection when clicking icons/padding.
        event.preventDefault();
      }
    };

    const rootClassNames = cn(
      "group flex items-center rounded-full bg-(--surface1) text-sm",
      "shadow hover:bg-(--surface2) focus-within:bg-(--surface-tonal1) transition-colors",
      "cursor-text",
      "data-[disabled]:opacity-60 data-[disabled]:cursor-not-allowed",
      fullWidth ? "w-full" : "w-auto",
      sizeClasses[fieldSize],
      className,
    );

    const inputClassNames = cn(
      "flex-1 bg-transparent text-(--text) placeholder:text-(--text-grey)",
      "border-none outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 caret-(--primary1)",
      "disabled:cursor-not-allowed disabled:text-(--text-grey)",
      inputClassName,
    );

    return (
      <div className={rootClassNames} data-disabled={disabled || undefined} onMouseDown={handleActivate}>
        {startIcon ? (
          <Slot className={cn("pointer-events-none text-(--text-grey)", iconClasses)}>
            {startIcon}
          </Slot>
        ) : null}
        <InputComponent ref={setRefs} className={inputClassNames} disabled={disabled} {...props}>
          {asChild ? children : null}
        </InputComponent>
        {endIcon ? (
          <Slot className={cn("pointer-events-none text-(--text-grey)", iconClasses)}>
            {endIcon}
          </Slot>
        ) : null}
      </div>
    );
  },
);

TextInput.displayName = "TextInput";

export default TextInput;
