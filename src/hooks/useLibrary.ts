import { useEffect } from "react";
import { useAuthStore } from "../store/authStore";
import { useLibraryStore } from "../store/libraryStore";

export const useLibraryBootstrap = (): void => {
  const client = useAuthStore((state) => state.session?.client);
  const bootstrap = useLibraryStore((state) => state.bootstrap);

  useEffect(() => {
    if (!client) {
      return;
    }

    let cancelled = false;

    const run = async () => {
      try {
        await bootstrap(client);
      } catch (error) {
        if (!cancelled) {
          console.error("Library bootstrap failed", error);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [bootstrap, client]);
};

export const useLibraryStatus = () => {
  return useLibraryStore((state) => state.status);
};

export const useArtists = () => {
  return useLibraryStore((state) => state.artists);
};

export const useAlbums = () => {
  return useLibraryStore((state) => state.albums);
};

export const useTracks = () => {
  return useLibraryStore((state) => state.tracks);
};

