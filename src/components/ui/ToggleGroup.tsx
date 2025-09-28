import React from "react";
import Toggle, { ToggleProps } from "./Toggle";
import cn from "../../utils/cn";

interface ToggleGroupContextType {
  value: string | string[];
  onValueChange: (value: string) => void;
  type: "single" | "multiple";
  variant?: ToggleProps["variant"];
  size?: ToggleProps["size"];
}

const ToggleGroupContext = React.createContext<ToggleGroupContextType | null>(null);

const useToggleGroupContext = () => {
  const context = React.useContext(ToggleGroupContext);
  if (!context) throw new Error("ToggleGroupItem must be used within a ToggleGroup");
  return context;
};

export interface ToggleGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  type: "single" | "multiple";
  value: string | string[];
  onValueChange: (value: string | string[]) => void;
  variant?: ToggleProps["variant"];
  size?: ToggleProps["size"];
}

const ToggleGroup = React.forwardRef<HTMLDivElement, ToggleGroupProps>(
  ({ className, variant, size, type, value, onValueChange, children, ...props }, ref) => {

    const handleItemClick = (itemValue: string) => {
      if (type === "multiple") {
        const newValue = Array.isArray(value) ? (value.includes(itemValue) ? value.filter(v => v !== itemValue) : [...value, itemValue]) : [itemValue];
        onValueChange(newValue);
      }
      else {
        onValueChange(value === itemValue ? "" : itemValue);
      }
    };

    return (
      <ToggleGroupContext.Provider value={{ value, onValueChange: handleItemClick, type, variant, size }}>
        <div ref={ref} className={cn("flex items-center justify-center gap-1", className)} {...props}>
          {children}
        </div>
      </ToggleGroupContext.Provider>
    );
  },
);
ToggleGroup.displayName = "ToggleGroup";

export interface ToggleGroupItemProps extends Omit<ToggleProps, "pressed" | "onPressedChange" | "type"> {
  value: string;
}

const ToggleGroupItem = React.forwardRef<HTMLButtonElement, ToggleGroupItemProps>(
  ({ className, children, value, ...props }, ref) => {
    const { value: contextValue, onValueChange, type, variant, size } = useToggleGroupContext();
    const isPressed = type === "multiple" ? contextValue.includes(value) : contextValue === value;

    return (
      <Toggle
        ref={ref}
        pressed={isPressed}
        onPressedChange={() => onValueChange(value)}
        variant={variant}
        size={size}
        className={cn("rounded-none first:rounded-l-md last:rounded-r-md", className)}
        {...props}
      >
        {children}
      </Toggle>
    );
  },
);
ToggleGroupItem.displayName = "ToggleGroupItem";

export { ToggleGroup, ToggleGroupItem };
