import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { AlbumIcon, BuildIcon, FavoriteFilledIcon, HomeIcon, PersonIcon } from "../../constants/icons";

interface NavItemProps {
  to: string;
  icon: ReactNode;
  label: string;
};

const NavItem = ({ to, icon, label }: NavItemProps) => (
  <NavLink
    to={to}
    className={({ isActive }) => (
      `
      flex items-center space-x-3 px-4 py-2 rounded-md trandistion-colors duration-200 ease-in-out
      ${isActive ?
        "bg-(--surface2) text-(--text) shadow-md" :
        "text-(--text-grey) hover:bg-(--surface1)"}
      `
    )}
  >
    {icon}
    <span>{label}</span>
  </NavLink>
);

const LeftSideBar = () => {
  return (
    <aside className="w-64 p-4 space-y-6 flex flex-col border-r font-semibold border-(--surface1)">
      <nav className="space-y-2">
        <NavItem to="/" icon={<HomeIcon />} label="Library" />
        {/* <NavItem to="/playlists" icon={<LibraryIcon />} label="Playlists" /> */}
        <NavItem to="/artists" icon={<PersonIcon />} label="Artists" />
        <NavItem to="/albums" icon={<AlbumIcon />} label="Albums" />
        <NavItem to="/likes" icon={<FavoriteFilledIcon />} label="Favourites" />
        <NavItem to="/components" icon={<BuildIcon />} label="Components" />
      </nav>
    </aside>
  );
};

export default LeftSideBar;
