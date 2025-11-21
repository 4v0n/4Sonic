import { Outlet } from "react-router-dom";
import TopBar from "./TopBar";
import LeftSideBar from "./LeftSideBar";
import BottomBar from "./BottomBar";
import { useLibraryBootstrap } from "../../hooks/useLibrary";

const AppShell = () => {
  useLibraryBootstrap();

  return (
    <div className="flex flex-col h-screen font-sans bg-(--surface0) text-(--text)">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <LeftSideBar />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
      <BottomBar />
    </div>
  );
};

export default AppShell;
