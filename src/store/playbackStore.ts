import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SubsonicSong } from "../types/subsonic";
import { useAuthStore } from "./authStore";
import { HiResAudioPlayer, ParametricEqBand } from "../services/audio/hiresPlayer";

type RepeatMode = "off" | "one";

interface PlaybackState {
  currentSong: SubsonicSong | null;
  coverArtUrl?: string;
  isPlaying: boolean;
  isLoading: boolean;
  position: number;
  duration: number;
  shuffle: boolean;
  repeat: RepeatMode;
  volume: number;
  isMuted: boolean;
  isScrubbing: boolean;
  error?: string;
  playSong: (songId: string) => Promise<void>;
  togglePlayPause: () => Promise<void>;
  pause: () => void;
  seek: (time: number) => void;
  beginScrub: () => void;
  endScrub: (finalTime?: number) => void;
  setVolume: (value: number) => void;
  changeVolumeBy: (delta: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  setEq: (bands: ParametricEqBand[]) => void;
}

const DEFAULT_VOLUME = 0.85;
const player = new HiResAudioPlayer();
player.setVolume(DEFAULT_VOLUME);

let activeRequestToken: symbol | null = null;
let scrubWasPlaying = false;

export const usePlaybackStore = create<PlaybackState>()(
  persist(
    (set, get) => {
      player.setCallbacks({
        onPlay: () => {
          set({ isPlaying: true, isLoading: false, error: undefined });
        },
        onPause: () => {
          set((state) => ({
            isPlaying: state.isScrubbing ? state.isPlaying : false,
          }));
        },
        onEnded: () => {
          set({ isPlaying: false, position: 0 });
        },
        onCanPlay: (duration) => {
          set((state) => ({
            duration: state.duration || duration,
            isLoading: false,
          }));
        },
        onProgress: (time, duration) => {
          set({
            position: time,
            duration: duration || get().duration,
          });
        },
        onError: (message) => {
          set({ error: message, isPlaying: false, isLoading: false });
        },
      });

      return {
        currentSong: null,
        coverArtUrl: undefined,
        isPlaying: false,
        isLoading: false,
        position: 0,
        duration: 0,
        shuffle: false,
        repeat: "off",
        volume: DEFAULT_VOLUME,
        isMuted: false,
        isScrubbing: false,
        error: undefined,

        playSong: async (songId: string) => {
          const session = useAuthStore.getState().session;
          if (!session) {
            set({ error: "Not authenticated", isLoading: false });
            return;
          }

          const requestToken = Symbol(songId);
          activeRequestToken = requestToken;

          set({
            isLoading: true,
            error: undefined,
            position: 0,
            duration: 0,
          });

          try {
            const { song } = await session.client.getSong(songId);
            if (activeRequestToken !== requestToken) {
              return;
            }

            const streamUrl = session.client.getStreamUrl(song.id, {
              maxBitRate: 0,
              format: "flac",
              estimateContentLength: true,
            });

            player.stop();
            player.setSource({ id: song.id, url: streamUrl, duration: song.duration });

            if (activeRequestToken !== requestToken) {
              return;
            }

            await player.play();
            if (activeRequestToken !== requestToken) {
              return;
            }

            set({
              currentSong: song,
              coverArtUrl: session.client.getCoverArtUrl(song.coverArt, { size: 512 }),
              isPlaying: true,
              isLoading: false,
              error: undefined,
              position: 0,
              duration: song.duration ?? player.getDuration(),
            });
            activeRequestToken = null;
          } catch (error) {
            if (activeRequestToken === requestToken) {
              set({
                isLoading: false,
                isPlaying: false,
                error: error instanceof Error ? error.message : "Unable to play song",
              });
              activeRequestToken = null;
            }
            throw error;
          }
        },

        togglePlayPause: async () => {
          const { isPlaying, currentSong } = get();
          if (!currentSong) {
            return;
          }
          if (isPlaying) {
            player.pause();
            set({ isPlaying: false });
          } else {
            try {
              await player.play();
              set({ isPlaying: true, isLoading: false, error: undefined });
            } catch (error) {
              set({
                isPlaying: false,
                error: error instanceof Error ? error.message : "Unable to resume playback",
              });
            }
          }
        },

        pause: () => {
          player.pause();
          set({ isPlaying: false });
        },

        seek: (time: number) => {
          player.seek(time);
          set({ position: time });
        },

        beginScrub: () => {
          scrubWasPlaying = get().isPlaying;
          set({ isScrubbing: true });
          if (!scrubWasPlaying && get().currentSong) {
            player.play().catch(() => undefined);
            set({ isPlaying: true });
          }
        },

        endScrub: (finalTime?: number) => {
          if (typeof finalTime === "number") {
            player.seek(finalTime);
            set({ position: finalTime });
          }
          if (!scrubWasPlaying) {
            player.pause();
            set({ isPlaying: false });
          }
          set({ isScrubbing: false });
        },

        setVolume: (value: number) => {
          const clamped = Math.max(0, Math.min(1, value));
          player.setVolume(clamped);
          set({
            volume: clamped,
            isMuted: clamped === 0,
          });
        },

        changeVolumeBy: (delta: number) => {
          const { volume } = get();
          const next = Math.max(0, Math.min(1, volume + delta));
          get().setVolume(next);
        },

        toggleMute: () => {
          const { isMuted, volume } = get();
          const nextMuted = !isMuted;
          player.setVolume(nextMuted ? 0 : volume);
          set({ isMuted: nextMuted });
        },

        toggleShuffle: () => {
          set((state) => ({ shuffle: !state.shuffle }));
        },

        cycleRepeat: () => {
          set((state) => ({ repeat: state.repeat === "off" ? "one" : "off" }));
        },

        setEq: (bands: ParametricEqBand[]) => {
          player.setParametricEq(bands);
        },
      };
    },
    {
      name: "playback-preferences",
      partialize: (state) => ({
        volume: state.volume,
        isMuted: state.isMuted,
        shuffle: state.shuffle,
        repeat: state.repeat,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          player.setVolume(state.isMuted ? 0 : state.volume ?? DEFAULT_VOLUME);
        }
      },
    },
  ),
);

export const playSong = async (songId: string): Promise<void> => {
  await usePlaybackStore.getState().playSong(songId);
};
