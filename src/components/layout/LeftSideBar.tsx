import type { MouseEvent, ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { AlbumIcon, BuildIcon, FavoriteFilledIcon, HomeIcon, PersonIcon } from "../../constants/icons";

interface NavItemProps {
  to: string;
  icon: ReactNode;
  label: string;
  isIconOnly: boolean;
}

const NavItem = ({ to, icon, label, isIconOnly }: NavItemProps) => (
  <NavLink
    to={to}
    className={({ isActive }) => (
      `
      group relative flex items-center w-full rounded-md transition-colors duration-200 ease-in-out
      px-3 py-2
      ${isIconOnly ? "justify-center gap-2" : "justify-start gap-3"}
      ${isActive
        ? "bg-(--surface2) text-(--text) shadow-md"
        : "text-(--text-grey) hover:bg-(--surface1)"}
      `
    )}
    title={label}
    aria-label={isIconOnly ? label : undefined}
  >
    {icon}
    {!isIconOnly && (
      <span className="truncate">{label}</span>
    )}
    {isIconOnly && (
      <span
        className="
          pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2
          whitespace-nowrap rounded-md bg-(--surface2) px-2 py-1 text-sm text-(--text)
          opacity-0 shadow-sm transition-opacity duration-150 group-hover:opacity-100 z-40 drop-shadow-lg
        "
        role="tooltip"
      >
        {label}
      </span>
    )}
  </NavLink>
);

interface LeftSideBarProps {
  width: number;
  isIconOnly: boolean;
  isResizing: boolean;
  onResizeStart: (event: MouseEvent<HTMLDivElement>) => void;
}

const LeftSideBar = ({ width, isIconOnly, isResizing, onResizeStart }: LeftSideBarProps) => {
  return (
    <aside
      className={`
        relative flex-shrink-0 space-y-6 flex flex-col border-r font-semibold border-(--surface1)
        ${isIconOnly ? "px-2 py-4" : "p-4"}
        bg-(--surface0) ${isResizing ? "transition-none" : "transition-[width] duration-150"}
      `}
      style={{ width }}
    >
      <nav className={`space-y-2 flex flex-col ${isIconOnly ? "items-center" : ""}`}>
        <NavItem to="/" icon={<HomeIcon />} label="Library" isIconOnly={isIconOnly} />
        {/* <NavItem to="/playlists" icon={<LibraryIcon />} label="Playlists" /> */}
        <NavItem to="/artists" icon={<PersonIcon />} label="Artists" isIconOnly={isIconOnly} />
        <NavItem to="/albums" icon={<AlbumIcon />} label="Albums" isIconOnly={isIconOnly} />
        <NavItem to="/likes" icon={<FavoriteFilledIcon />} label="Favourites" isIconOnly={isIconOnly} />
        <NavItem to="/components" icon={<BuildIcon />} label="Components" isIconOnly={isIconOnly} />
      </nav>
      <div
        className={`
          absolute top-0 right-0 h-full w-1 cursor-col-resize
          ${isResizing ? "bg-(--surface2)" : "bg-transparent hover:bg-(--surface2)"}
        `}
        onMouseDown={onResizeStart}
        aria-label="Resize sidebar"
        role="separator"
      />
    </aside>
  );
};

export default LeftSideBar;
