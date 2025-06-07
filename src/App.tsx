import { Routes, Route } from "react-router-dom";
import LeftSideBar from "./components/layout/LeftSideBar";
import RightSideBar from "./components/layout/RightSideBar";
import TopBar from "./components/layout/TopBar";
import BottomBar from "./components/layout/BottomBar";
import LibraryPage from "./pages/LibraryPage";
import PlaylistsPage from "./pages/PlaylistsPage";
import LikedSongsPage from "./pages/LikedSongsPage";
import AlbumsPage from "./pages/AlbumsPage";
import ArtistsPage from "./pages/ArtistsPage";
import SettingsPage from "./pages/SettingsPage";
import AccountsPage from "./pages/AccountsPage";
import { useEffect, useRef } from "react";
import { startup } from "./services/StartupService";

function App() {
  const startedUp = useRef(false);
  useEffect(() => {
    if (startedUp.current) return;
    startedUp.current = true;
    startup();
  }, []);

  return (
    <div className="flex flex-col h-screen font-sans bg-(--surface0) text-(--text)">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <LeftSideBar />
        <main className="flex-1 overflow-y-auto p-6">
          <Routes>
            <Route path="/" element={<LibraryPage />} />
            <Route path="/playlists" element={<PlaylistsPage />} />
            <Route path="/likes" element={<LikedSongsPage />} />
            <Route path="/albums" element={<AlbumsPage />} />
            <Route path="/artists" element={<ArtistsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/account" element={<AccountsPage />} />
          </Routes>
        </main>
        <RightSideBar />
      </div>
      <BottomBar />
    </div>
  );
}

export default App;
