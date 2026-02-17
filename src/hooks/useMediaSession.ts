import { useEffect } from "react";
import { toast } from "sonner";
import { usePlaybackStore } from "../store/playbackStore";
import { DEFAULT_COVER_SIZE } from "../utils/mediaImages";

type OptionalMediaSessionAction = "like" | "favorite";

const getMediaSession = (): (Navigator & { mediaSession: MediaSession })["mediaSession"] | null => {
  if (typeof navigator === "undefined") return null;
  const maybeNavigator = navigator as Navigator & { mediaSession?: MediaSession };
  return maybeNavigator.mediaSession ?? null;
};

const updatePositionState = (position: number, duration: number): void => {
  const mediaSession = getMediaSession();
  if (!mediaSession || typeof mediaSession.setPositionState !== "function") return;

  try {
    mediaSession.setPositionState({
      duration: Number.isFinite(duration) ? Math.max(duration, 0) : 0,
      position: Math.max(0, Math.min(position, Number.isFinite(duration) ? duration : Number.MAX_SAFE_INTEGER)),
      playbackRate: 1,
    });
  } catch (error) {
    console.debug("Unable to update media session position", error);
  }
};

export const useMediaSession = (): void => {
  const currentSong = usePlaybackStore((state) => state.currentSong);
  const coverArtUrl = usePlaybackStore((state) => state.coverArtUrl);
  const position = usePlaybackStore((state) => state.position);
  const duration = usePlaybackStore((state) => state.duration);
  const isPlaying = usePlaybackStore((state) => state.isPlaying);

  useEffect(() => {
    const mediaSession = getMediaSession();
    if (!mediaSession) return;

    const metadata = currentSong
      ? new MediaMetadata({
        title: currentSong.title ?? "",
        artist: currentSong.artist ?? "",
        album: currentSong.album ?? "",
        artwork: coverArtUrl ? [{ src: coverArtUrl, sizes: `${DEFAULT_COVER_SIZE}x${DEFAULT_COVER_SIZE}` }] : [],
      })
      : null;

    mediaSession.metadata = metadata;

    return () => {
      if (!currentSong) {
        mediaSession.metadata = null;
      }
    };
  }, [coverArtUrl, currentSong?.album, currentSong?.artist, currentSong?.id, currentSong?.title]);

  useEffect(() => {
    const mediaSession = getMediaSession();
    if (!mediaSession) return;

    const ensurePlaying = () => {
      const state = usePlaybackStore.getState();
      if (!state.isPlaying) {
        void state.togglePlayPause();
      }
    };

    const ensurePaused = () => {
      const state = usePlaybackStore.getState();
      if (state.isPlaying) {
        state.pause();
      }
    };

    const handlePrevious = () => {
      void usePlaybackStore.getState().playPrevious();
    };

    const handleNext = () => {
      void usePlaybackStore.getState().playNext();
    };

    const handleStop = () => {
      const state = usePlaybackStore.getState();
      state.pause();
      state.seek(0);
    };

    const handleSeekTo = (event: MediaSessionActionDetails) => {
      const target = "seekTime" in event ? event.seekTime : undefined;
      if (typeof target === "number") {
        const state = usePlaybackStore.getState();
        state.seek(Math.max(0, Math.min(target, state.duration || target)));
      }
    };

    const handleLike = () => {
      const state = usePlaybackStore.getState();
      const title = state.currentSong?.title ?? "Unknown track";
      console.log("Media session like", {
        id: state.currentSong?.id,
        title,
        artist: state.currentSong?.artist,
      });
      toast.success(`Liked ${title}`);
    };

    const setHandler = (
      action: MediaSessionAction | OptionalMediaSessionAction,
      handler: MediaSessionActionHandler | null,
    ) => {
      try {
        mediaSession.setActionHandler(action as MediaSessionAction, handler);
      } catch (error) {
        console.debug(`Unable to attach media session handler for ${action}`, error);
      }
    };

    setHandler("play", ensurePlaying);
    setHandler("pause", ensurePaused);
    setHandler("previoustrack", handlePrevious);
    setHandler("nexttrack", handleNext);
    setHandler("stop", handleStop);
    setHandler("seekto", handleSeekTo);
    setHandler("like", handleLike);
    setHandler("favorite", handleLike);

    return () => {
      setHandler("play", null);
      setHandler("pause", null);
      setHandler("previoustrack", null);
      setHandler("nexttrack", null);
      setHandler("stop", null);
      setHandler("seekto", null);
      setHandler("like", null);
      setHandler("favorite", null);
    };
  }, []);

  useEffect(() => {
    updatePositionState(position, duration);
  }, [duration, position]);

  useEffect(() => {
    const mediaSession = getMediaSession();
    if (!mediaSession) return;
    mediaSession.playbackState = isPlaying ? "playing" : "paused";
  }, [isPlaying]);
};
