import React from "react";
import { NavLink } from "react-router-dom";
import { AlbumIcon, FavoriteFilledIcon, HomeIcon, LibraryIcon, PersonIcon } from "../../constants/icons";

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
};

const NavItem = ({ to, icon, label }: NavItemProps) => (
  <NavLink
    to={to}
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    className={({ isActive }) => (
      `
      flex items-center space-x-3 px-4 py-2 rounded-md trandistion-colors duration-200 ease-in-out
      `
    )}
  >
    {icon}
    <span>{label}</span>
  </NavLink>
);

const LeftSideBar = () => {
  return (
    <aside className="w-64 p-4 space-y-6 flex flex-col border-r">
      <nav className="space-y-2">
        <NavItem to="/" icon={<HomeIcon />} label="My Library" />
        <NavItem to="/" icon={<LibraryIcon />} label="Playlists" />
        <NavItem to="/" icon={<FavoriteFilledIcon />} label="Liked Songs" />
        <NavItem to="/" icon={<AlbumIcon />} label="Albums" />
        <NavItem to="/" icon={<PersonIcon />} label="Artists" />
      </nav>
    </aside>
  );
};

export default LeftSideBar;