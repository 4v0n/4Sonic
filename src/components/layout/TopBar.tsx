import { useNavigate } from "react-router-dom";
import { ArrowBackIcon, ArrowForwardIcon, PersonIcon, SettingsIcon } from "../../constants/icons";
import IconDropdown, { MenuOption } from "../ui/IconDropdown";

const TopBar = () => {
  const navigate = useNavigate();

  const profileMenuOptions: MenuOption[] = [
    { label: "Account", onClick: () => navigate("/account"), icon: <PersonIcon fontSize="small" /> },
    { label: "Settings", onClick: () => navigate("/settings"), icon: <SettingsIcon fontSize="small" /> },
    { isDivider: true },
  ];

  return (
    <header className="h-16 flex items-center justify-between px-6 sticky top-0 z-30 border-b">
      <div className="flex items-center space-x-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full transition-colors" aria-label="Go back">
          <ArrowBackIcon fontSize="small" />
        </button>
        <button onClick={() => navigate(1)} className="p-2 rounded-full transition-colors" aria-label="Go forward">
          <ArrowForwardIcon fontSize="small" />
        </button>
      </div>
      <div>
        {/* Empty div */}
      </div>
      <div className="flex items-center space-x-4">
        <button className="">
          <IconDropdown
            buttonAriaLabel="Account and Settings"
            triggerContent={
              <PersonIcon />
            }
            options={profileMenuOptions}
          />
        </button>
      </div>
    </header>
  );
};

export default TopBar;