import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  forwardRef,
  isValidElement,
  cloneElement,
  useLayoutEffect,
} from "react";
import ReactDOM from "react-dom";
import { ArrowForwardIcon } from "../../constants/icons";
import cn from "../../utils/cn";

interface ContextMenuContextType {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  position: { x: number; y: number };
  setPosition: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  triggerRef: React.RefObject<HTMLElement>;
}

const ContextMenuContext = createContext<ContextMenuContextType | null>(null);

const useContextMenu = () => {
  const context = useContext(ContextMenuContext);
  if (!context) throw new Error("ContextMenu compound components must be used within a <ContextMenu>");
  return context;
};

export const ContextMenu: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLElement>(null);

  return (
    <ContextMenuContext.Provider value={{ isOpen, setIsOpen, position, setPosition, triggerRef }}>
      {children}
    </ContextMenuContext.Provider>
  );
};

export const ContextMenuTrigger = forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement> & { asChild?: boolean; children: React.ReactNode }
>(({ children, asChild = false, onContextMenu, ...props }, ref) => {
  const { setIsOpen, setPosition, triggerRef } = useContextMenu();

  const handleRef = (node: HTMLElement | null) => {
    (triggerRef as React.MutableRefObject<HTMLElement | null>).current = node;
    if (typeof ref === "function") {
      ref(node);
    } else if (ref && "current" in ref) {
      (ref as React.MutableRefObject<HTMLElement | null>).current = node;
    }
  };

  const handleContextMenu = (e: React.MouseEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(true);
    setPosition({ x: e.clientX, y: e.clientY });
    onContextMenu?.(e);
  };

  if (asChild && isValidElement(children)) {
    const childElement = children as React.ReactElement<Record<string, unknown>>;
    const childProps = childElement.props;
    return cloneElement(childElement, {
      ...props,
      ...childProps,
      ref: handleRef,
      onContextMenu: (e: React.MouseEvent<HTMLElement>) => {
        handleContextMenu(e);
        if (typeof childProps.onContextMenu === "function") {
          childProps.onContextMenu(e);
        }
      },
      "data-new-context-menu-trigger": "true",
    });
  }

  return (
    <div
      {...props}
      ref={handleRef}
      onContextMenu={handleContextMenu}
      data-new-context-menu-trigger="true"
    >
      {children}
    </div>
  );
});
ContextMenuTrigger.displayName = "ContextMenuTrigger";

export const ContextMenuPortal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return ReactDOM.createPortal(children, document.body);
};

export const ContextMenuContent = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { "aria-label"?: string }>(
  ({ className, children, ...props }, ref) => {
    const { isOpen, setIsOpen, position, triggerRef } = useContextMenu();
    const contentRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
      const menu = contentRef.current;
      if (!menu || !isOpen) return;

      const { innerWidth, innerHeight } = window;
      const { offsetWidth, offsetHeight } = menu;

      let finalX = position.x;
      let finalY = position.y;

      if (finalX + offsetWidth > innerWidth) finalX = Math.max(10, innerWidth - offsetWidth - 10);
      if (finalY + offsetHeight > innerHeight) finalY = Math.max(10, innerHeight - offsetHeight - 10);

      menu.style.left = `${finalX}px`;
      menu.style.top = `${finalY}px`;
    }, [position, isOpen]);

    useEffect(() => {
      if (!isOpen) return;

      const handleClickOutside = (e: MouseEvent) => {
        if (
          triggerRef.current &&
          !triggerRef.current.contains(e.target as Node) &&
          contentRef.current &&
          !contentRef.current.contains(e.target as Node)
        ) {
          setIsOpen(false);
        }
      };

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") setIsOpen(false);
      };

      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("keydown", handleKeyDown);
      };
    }, [isOpen, setIsOpen, triggerRef]);

    if (!isOpen) return null;

    return (
      <ContextMenuPortal>
        <div
          ref={(node) => {
            (contentRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
            if (typeof ref === "function") {
              ref(node);
            } else if (ref && "current" in ref) {
              (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
            }
          }}
          className={cn(
            "fixed z-50 w-56 rounded-md shadow-lg",
            "bg-(--surface1)",
            className,
          )}
          role="menu"
          aria-orientation="vertical"
          {...props}
        >
          <div className="py-1" role="none">
            {children}
          </div>
        </div>
      </ContextMenuPortal>
    );
  },
);
ContextMenuContent.displayName = "ContextMenuContent";

export const ContextMenuItem = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { inset?: boolean; onSelect?: (event: React.MouseEvent<HTMLButtonElement>) => void; icon?: React.ReactNode }
    >(({ className, inset, onSelect, icon, children, ...props }, ref) => {
      const { setIsOpen } = useContextMenu();

      const handleSelect = (e: React.MouseEvent<HTMLButtonElement>) => {
        onSelect?.(e);
        if (!e.defaultPrevented) setIsOpen(false);
      };

      return (
        <button
          ref={ref}
          onClick={handleSelect}
          className={cn(
            "flex cursor-pointer transition-colors items-center gap-3 w-full text-left px-4 py-2 text-sm",
            "text-(--text-grey) hover:bg-(--surface2) hover:text-(--text)",
            "disabled:pointer-events-none disabled:opacity-50",
            inset && "pl-8",
            className,
          )}
          role="menuitem"
          {...props}
        >
          {icon && (
            <span className="flex h-5 w-5 shrink-0 items-center justify-center text-(--text-grey) [&>svg]:h-5 [&>svg]:w-5">
              {icon}
            </span>
          )}
          {children}
        </button>
      );
    });
ContextMenuItem.displayName = "ContextMenuItem";

export const ContextMenuSeparator = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "my-1 h-px bg-(--surface2)",
        className,
      )}
      role="separator"
      {...props}
    />
  ),
);
ContextMenuSeparator.displayName = "ContextMenuSeparator";

interface SubMenuContextType {
  isSubOpen: boolean;
  setIsSubOpen: React.Dispatch<React.SetStateAction<boolean>>;
  triggerRef: React.RefObject<HTMLDivElement>;
  open: () => void;
  close: () => void;
}

const SubMenuContext = createContext<SubMenuContextType | null>(null);

const useSubMenuContext = () => {
  const ctx = useContext(SubMenuContext);
  if (!ctx) throw new Error("SubMenu components must be used within a <ContextMenuSub>");
  return ctx;
};

export const ContextMenuSub: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSubOpen, setIsSubOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<number | null>(null);

  const open = () => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    setIsSubOpen(true);
  };

  const close = () => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => setIsSubOpen(false), 150);
  };

  return (
    <SubMenuContext.Provider value={{ isSubOpen, setIsSubOpen, triggerRef, open, close }}>
      <div className="relative">{children}</div>
    </SubMenuContext.Provider>
  );
};

export const ContextMenuSubTrigger = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { inset?: boolean }
>(({ className, inset, children, ...props }, ref) => {
  const { triggerRef, open, close } = useSubMenuContext();

  return (
    <div
      ref={(node) => {
        (triggerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
        if (typeof ref === "function") {
          ref(node);
        } else if (ref && "current" in ref) {
          (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }
      }}
      onMouseEnter={open}
      onMouseLeave={close}
      className={cn(
        "relative flex cursor-pointer select-none items-center rounded-sm px-4 py-2 text-sm text-(--text-grey)",
        "transition-colors hover:bg-(--surface2) focus:bg-(--surface2) hover:text-(--text)",
        inset && "pl-8",
        className,
      )}
      role="menuitem"
      {...props}
    >
      {children}
      <ArrowForwardIcon fontSize="inherit" className="ml-auto" />
    </div>
  );
});
ContextMenuSubTrigger.displayName = "ContextMenuSubTrigger";

export const ContextMenuSubContent = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    const { isSubOpen, open, close, triggerRef } = useSubMenuContext();
    const subContentRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
      const menu = subContentRef.current;
      const anchor = triggerRef.current;
      if (!menu || !anchor || !isSubOpen) return;

      const rect = anchor.getBoundingClientRect();
      const { innerWidth, innerHeight } = window;
      const { offsetWidth, offsetHeight } = menu;

      let finalX = rect.right;
      let finalY = rect.top;

      if (finalX + offsetWidth > innerWidth) finalX = rect.left - offsetWidth;
      if (finalY + offsetHeight > innerHeight) finalY = Math.max(10, innerHeight - offsetHeight - 10);

      menu.style.left = `${finalX}px`;
      menu.style.top = `${finalY}px`;
    }, [isSubOpen, triggerRef]);

    if (!isSubOpen) return null;

    return (
      <ContextMenuPortal>
        <div
          ref={(node) => {
            (subContentRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
            if (typeof ref === "function") {
              ref(node);
            } else if (ref && "current" in ref) {
              (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
            }
          }}
          onMouseEnter={open}
          onMouseLeave={close}
          className={cn(
            "fixed z-50 w-56 rounded-md shadow-lg bg-(--surface1)",
            className,
          )}
          role="menu"
          aria-orientation="vertical"
          {...props}
        >
          <div className="py-1" role="none">
            {children}
          </div>
        </div>
      </ContextMenuPortal>
    );
  },
);
ContextMenuSubContent.displayName = "ContextMenuSubContent";
