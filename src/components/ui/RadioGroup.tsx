import React from "react";
import cn from "../../utils/cn";

interface RadioGroupContextType {
  value: string;
  onValueChange: (value: string) => void;
  name?: string;
}

const RadioGroupContext = React.createContext<RadioGroupContextType | null>(null);

const useRadioGroupContext = () => {
  const context = React.useContext(RadioGroupContext);
  if (!context) throw new Error("RadioGroupItem must be used within a RadioGroup");
  return context;
};

export interface RadioGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  onValueChange: (value: string) => void;
  name?: string;
}

const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
  ({ className, value, onValueChange, name, ...props }, ref) => {
    return (
      <RadioGroupContext.Provider value={{ value, onValueChange, name }}>
        <div ref={ref} role="radiogroup" className={cn("grid gap-2", className)} {...props} />
      </RadioGroupContext.Provider>
    );
  },
);
RadioGroup.displayName = "RadioGroup";

export interface RadioGroupItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

const RadioGroupItem = React.forwardRef<HTMLButtonElement, RadioGroupItemProps>(
  ({ className, value, ...props }, ref) => {
    const { value: selectedValue, onValueChange, name } = useRadioGroupContext();
    const isSelected = selectedValue === value;
    return (
      <button
        ref={ref}
        type="button"
        role="radio"
        aria-checked={isSelected}
        data-state={isSelected ? "checked" : "unchecked"}
        onClick={() => onValueChange(value)}
        name={name}
        value={value}
        className={cn(
          "aspect-square h-4 w-4 rounded-full border botder-(--text) text-(--text) cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      >
        <div className="flex items-center justify-center w-full h-full">
          {isSelected && <div className="h-2.5 w-2.5 rounded-full bg-current" />}
        </div>
      </button>
    );
  },
);
RadioGroupItem.displayName = "RadioGroupItem";

export { RadioGroup, RadioGroupItem };