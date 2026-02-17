import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import LibraryPage from "./pages/LibraryPage";
import PlaylistsPage from "./pages/PlaylistsPage";
import LikedSongsPage from "./pages/LikedSongsPage";
import AlbumsPage from "./pages/AlbumsPage";
import AlbumDetailPage from "./pages/AlbumDetailPage";
import ArtistsPage from "./pages/ArtistsPage";
import ArtistDetailPage from "./pages/ArtistDetailPage";
import SettingsPage from "./pages/SettingsPage";
import AccountsPage from "./pages/AccountsPage";
import ComponentShowcasePage from "./pages/ComponentShowcasePage";
import LoginPage from "./pages/LoginPage";
import AppShell from "./components/layout/AppShell";
import RequireAuth from "./components/layout/RequireAuth";
import LoadingScreen from "./components/layout/LoadingScreen";
import { useAuthStore } from "./store/authStore";

function App() {
  const hydrate = useAuthStore((state) => state.hydrateFromStorage);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const session = useAuthStore((state) => state.session);

  useEffect(() => {
    if (!isHydrated) {
      void hydrate();
    }
  }, [hydrate, isHydrated]);

  if (!isHydrated) {
    return <LoadingScreen message="Loading Four Sonic..." />;
  }

  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to="/" replace /> : <LoginPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<LibraryPage />} />
          <Route path="/playlists" element={<PlaylistsPage />} />
          <Route path="/likes" element={<LikedSongsPage />} />
          <Route path="/albums" element={<AlbumsPage />} />
          <Route path="/albums/:albumId" element={<AlbumDetailPage />} />
          <Route path="/artists" element={<ArtistsPage />} />
          <Route path="/artists/:artistId" element={<ArtistDetailPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/account" element={<AccountsPage />} />
          <Route path="/components" element={<ComponentShowcasePage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
