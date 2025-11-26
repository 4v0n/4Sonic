import React, { createContext, useContext, forwardRef, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { CloseIcon } from "../../constants/icons";
import cn from "../../utils/cn";
import Button from "./Button";

interface DialogContextType {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}
const DialogContext = createContext<DialogContextType | null>(null);

const useDialogContext = () => {
  const context = useContext(DialogContext);
  if (!context) throw new Error("Dialog components must be used within a <Dialog>");
  return context;
};

interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}
export const Dialog: React.FC<DialogProps> = ({ open: controlledOpen, onOpenChange, children }) => {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const isOpen = controlledOpen ?? uncontrolledOpen;

  const setIsOpen: React.Dispatch<React.SetStateAction<boolean>> = (next) => {
    if (typeof next === "function") {
      const updater = next as (prev: boolean) => boolean;
      const computed = updater(isOpen);
      if (onOpenChange) onOpenChange(computed);
      else setUncontrolledOpen(computed);
    } else if (onOpenChange) {
      onOpenChange(next);
    } else {
      setUncontrolledOpen(next);

    }
  };

  return <DialogContext.Provider value={{ isOpen, setIsOpen }}>{children}</DialogContext.Provider>;
};

export const DialogTrigger = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean; children: React.ReactNode }
>(({ children, asChild = false, onClick, ...props }, ref) => {
  const { setIsOpen } = useDialogContext();
  const handleClick = (e: React.MouseEvent<HTMLElement>) => {
    setIsOpen(true);
    onClick?.(e as unknown as React.MouseEvent<HTMLButtonElement>);
  };

  if (asChild && React.isValidElement(children)) {
    type ClickableProps = { onClick?: (e: React.MouseEvent<HTMLElement>) => void } & Record<string, unknown>;
    const child = children as React.ReactElement;
    const childProps = child.props as ClickableProps;

    return React.cloneElement(child, {
      ...props,
      ...childProps,
      onClick: (e: React.MouseEvent<HTMLElement>) => {
        handleClick(e);
        childProps.onClick?.(e);
      },
    });
  }

  return (
    <Button ref={ref} onClick={(e) => handleClick(e)} {...props}>
      {children}
    </Button>
  );
});
DialogTrigger.displayName = "DialogTrigger";

const DialogPortal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mounted, setMounted] = React.useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? ReactDOM.createPortal(children, document.body) : null;
};

export const DialogOverlay = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const { isOpen } = useDialogContext();
    return (
      <div
        ref={ref}
        data-state={isOpen ? "open" : "closed"}
        className={cn(
          "fixed inset-0 z-50 backdrop-blur-xs",
          "data-[state=open]:animate-overlay-show data-[state=closed]:animate-overlay-hide",
          className,
        )}
        {...props}
      />
    );
  },
);
DialogOverlay.displayName = "DialogOverlay";

export const DialogContent = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    const { isOpen, setIsOpen } = useDialogContext();
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          e.preventDefault();
          setIsOpen(false);
        }
      };
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }, [setIsOpen]);

    useEffect(() => {
      if (isOpen && contentRef.current) {
        const focusableElements = contentRef.current.querySelectorAll<HTMLElement>(
          "button, [href], input, select, textarea, [tabindex]:not([tabindex=\"-1\"])",
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        const handleTabKeyPress = (e: KeyboardEvent) => {
          if (e.key === "Tab") {
            if (e.shiftKey && document.activeElement === firstElement) {
              e.preventDefault();
              lastElement?.focus();
            } else if (!e.shiftKey && document.activeElement === lastElement) {
              e.preventDefault();
              firstElement?.focus();
            }
          }
        };

        firstElement?.focus();
        document.addEventListener("keydown", handleTabKeyPress);
        return () => document.removeEventListener("keydown", handleTabKeyPress);
      }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
      <DialogPortal>
        <DialogOverlay onClick={() => setIsOpen(false)} />
        <div
          ref={ref}
          role="dialog"
          aria-modal="true"
          data-state={isOpen ? "open" : "closed"}
          className={cn(
            "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-(--surface2) bg-(--surface0) p-6 shadow-lg sm:rounded-lg",
            "data-[state=open]:animate-content-show data-[state=closed]:animate-content-hide",
            className,
          )}
          {...props}
        >
          {children}
          <DialogClose asChild>
            <Button
              className="absolute right-4 top-4 rounded-full opacity-70 ring-offset-(--surface0) transition-opacity shadow-none
                hover:opacity-100 disabled:pointer-events-none data-[state=open]:bg-(--primary2) data-[state=open]:text-(--text-grey)"
            >
              <CloseIcon className="h-4 w-4" />
            </Button>
          </DialogClose>
        </div>
      </DialogPortal>
    );
  },
);
DialogContent.displayName = "DialogContent";

export const DialogHeader = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
  ),
);
DialogHeader.displayName = "DialogHeader";

export const DialogFooter = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
      {...props}
    />
  ),
);
DialogFooter.displayName = "DialogFooter";

export const DialogTitle = forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h2 ref={ref} className={cn("text-lg font-semibold leading-none tracking-tight text-(--text)", className)} {...props} />
  ),
);
DialogTitle.displayName = "DialogTitle";

export const DialogDescription = forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-(--text-grey)", className)} {...props} />
  ),
);
DialogDescription.displayName = "DialogDescription";

export const DialogClose = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean; children: React.ReactNode }
>(({ children, asChild = false, onClick, ...props }, ref) => {
  const { setIsOpen } = useDialogContext();
  const handleClick = (e: React.MouseEvent<HTMLElement>) => {
    setIsOpen(false);
    onClick?.(e as unknown as React.MouseEvent<HTMLButtonElement>);
  };

  if (asChild && React.isValidElement(children)) {
    type ClickableProps = { onClick?: (e: React.MouseEvent<HTMLElement>) => void } & Record<string, unknown>;
    const child = children as React.ReactElement;
    const childProps = child.props as ClickableProps;

    return React.cloneElement(child, {
      ...props,
      ...childProps,
      onClick: (e: React.MouseEvent<HTMLElement>) => {
        handleClick(e);
        childProps.onClick?.(e);
      },
    });
  }

  return (
    <Button ref={ref} onClick={(e) => handleClick(e)} {...props}>
      {children}
    </Button>
  );
});
DialogClose.displayName = "DialogClose";
