import { useNavigate } from "react-router-dom";
import { ArrowBackIcon, ArrowForwardIcon, PersonIcon, SettingsIcon } from "../../constants/icons";
import IconDropdown, { MenuOption } from "../ui/IconDropdown";
import Button from "../ui/Button";

const TopBar = () => {
  const navigate = useNavigate();

  const profileMenuOptions: MenuOption[] = [
    { label: "Account", onClick: () => navigate("/account"), icon: <PersonIcon fontSize="small" /> },
    { label: "Settings", onClick: () => navigate("/settings"), icon: <SettingsIcon fontSize="small" /> },
  ];

  return (
    <header className="h-16 flex items-center justify-between px-6 sticky top-0 z-30 border-b border-(--surface1) shadow-md">
      <div className="flex items-center space-x-3">
        <Button onClick={() => navigate(-1)} aria-label="Go back" icon={<ArrowBackIcon fontSize="small" />} className="shadow-none" />
        <Button onClick={() => navigate(1)} aria-label="Go back" icon={<ArrowForwardIcon fontSize="small" />} className="shadow-none" />
      </div>
      <div className="flex items-center space-x-4">
        <button className="">
          <IconDropdown
            buttonAriaLabel="Account and Settings"
            triggerContent={
              <PersonIcon
                className="w-8 h-8 rounded-full object-cover"
              />
            }
            options={profileMenuOptions}
            dropdownPlacement="bottom-right"
          />
        </button>
      </div>
    </header>
  );
};

export default TopBar;