import { create } from "zustand";
import { persist } from "zustand/middleware";

/** Upper bound for the evenly-split crossfade between tracks, in seconds. */
export const MAX_CROSSFADE_SECONDS = 12;

type PlaybackSettingsState = {
  // preloads next track and hands off without a load cycle; false means a short gap is expected
  gaplessEnabled: boolean;
  // overlap in seconds; 0 is a seamless cut, higher values crossfade; only applies when gapless is enabled
  crossfadeDuration: number;
  setGaplessEnabled: (enabled: boolean) => void;
  setCrossfadeDuration: (seconds: number) => void;
};

export const usePlaybackSettingsStore = create<PlaybackSettingsState>()(
  persist(
    (set) => ({
      gaplessEnabled: true,
      crossfadeDuration: 0,
      setGaplessEnabled: (enabled) => set({ gaplessEnabled: enabled }),
      setCrossfadeDuration: (seconds) => {
        const clamped = Math.max(0, Math.min(MAX_CROSSFADE_SECONDS, seconds));
        set({ crossfadeDuration: clamped });
      },
    }),
    {
      name: "playback-settings",
    },
  ),
);
