import type { MouseEvent, ReactNode } from "react";
import { NavLink } from "react-router-dom";
import Tooltip from "../ui/Tooltip";
import { AlbumIcon, BuildIcon, FavoriteFilledIcon, HomeIcon, PersonIcon } from "../../constants/icons";

interface NavItemProps {
  to: string;
  icon: ReactNode;
  label: string;
  isIconOnly: boolean;
}

const NavItem = ({ to, icon, label, isIconOnly }: NavItemProps) => (
  <Tooltip content={label} side="right" disabled={!isIconOnly}>
    <NavLink
      to={to}
      className={`
        group relative flex items-center w-full rounded-md transition-colors duration-200 ease-in-out
        px-3 py-2
        ${isIconOnly ? "justify-center gap-2" : "justify-start gap-3"}
        text-text-grey hover:bg-surface1
        [&.active]:bg-surface2 [&.active]:text-text [&.active]:shadow-md [&.active]:hover:bg-surface2
      `}
      aria-label={isIconOnly ? label : undefined}
    >
      {icon}
      {!isIconOnly && (
        <span className="truncate">{label}</span>
      )}
    </NavLink>
  </Tooltip>
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
        relative flex-shrink-0 space-y-6 flex flex-col font-semibold
        ${isIconOnly ? "px-2 py-4" : "p-4"}
        bg-surface0 ${isResizing ? "transition-none" : "transition-[width] duration-150"}
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
          ${isResizing ? "bg-surface2" : "bg-transparent hover:bg-surface2"}
        `}
        onMouseDown={onResizeStart}
        aria-label="Resize sidebar"
        role="separator"
      />
    </aside>
  );
};

export default LeftSideBar;
