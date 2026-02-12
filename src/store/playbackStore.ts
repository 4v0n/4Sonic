import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SubsonicSong } from "../types/subsonic";
import { QueueItem } from "../types/playback";
import { useAuthStore } from "./authStore";
import { HiResAudioPlayer, ParametricEqBand } from "../services/audio/player";
import { audioCache } from "../services/audio/audioCache";
import { queueItemToSong, songToQueueItem } from "../utils/playbackMapping";
import { getCoverArtUrl } from "../utils/mediaImages";

type RepeatMode = "off" | "one" | "all";

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
  queue: QueueItem[];
  queueOrder: number[];
  queuePosition: number;
  getFrequencyData: () => Uint8Array | null;
  getSampleRate: () => number | null;
  playSong: (songId: string, options?: { queueItem?: QueueItem }) => Promise<void>;
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
  setQueue: (items: QueueItem[], startIndex?: number) => Promise<void>;
  playFromQueue: (orderIndex: number) => Promise<void>;
  playNext: () => Promise<void>;
  playPrevious: () => Promise<void>;
}

const DEFAULT_VOLUME = 0.85;
const END_TOLERANCE_SECONDS = 1.5;
const player = new HiResAudioPlayer();
player.setVolume(DEFAULT_VOLUME);

let activeRequestToken: symbol | null = null;
let scrubWasPlaying = false;
let releaseCurrentSource: (() => void) | null = null;

const createQueueOrder = (count: number, shuffle: boolean, anchorIndex: number): number[] => {
  const indices = Array.from({ length: count }, (_, index) => index);
  const clampedAnchor = Math.min(Math.max(anchorIndex, 0), Math.max(count - 1, 0));
  if (!shuffle) {
    return indices;
  }

  const rest = indices.filter((index) => index !== clampedAnchor);
  for (let i = rest.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }

  return [clampedAnchor, ...rest];
};

const resolveDuration = (duration: number, fallback: number): number => {
  if (Number.isFinite(duration) && duration > 0) {
    return duration;
  }
  return fallback;
};

const clampTime = (time: number, duration?: number): number => {
  const safeTime = Number.isFinite(time) ? time : 0;
  if (Number.isFinite(duration) && (duration ?? 0) > 0) {
    return Math.max(0, Math.min(safeTime, duration ?? 0));
  }
  return Math.max(0, safeTime);
};

export const usePlaybackStore = create<PlaybackState>()(
  persist(
    (set, get) => {
      const getCurrentQueueIndex = (state: PlaybackState): number => {
        const queueIndex = state.queueOrder[state.queuePosition];
        return typeof queueIndex === "number" ? queueIndex : -1;
      };

      const prefetchNextInQueue = async (allowNetwork: boolean) => {
        if (!allowNetwork) return;
        const session = useAuthStore.getState().session;
        if (!session) return;

        const state = get();
        const nextQueueIndex = state.queueOrder[state.queuePosition + 1];
        if (typeof nextQueueIndex !== "number") return;
        const nextItem = state.queue[nextQueueIndex];
        if (!nextItem) return;

        try {
          const streamUrl = session.client.getStreamUrl(nextItem.id, {
            maxBitRate: 0,
            format: "flac",
            estimateContentLength: true,
          });
          const playable = await audioCache.getPlayableSource({
            id: nextItem.id,
            url: streamUrl,
            duration: nextItem.duration,
          });
          playable.cachePromise?.catch(() => undefined);
          playable.cleanup?.();
        } catch (error) {
          console.debug("Prefetch failed", error);
        }
      };

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
          const state = get();
          const actualDuration = resolveDuration(player.getDuration(), state.duration);
          const actualPosition = Number.isFinite(player.getCurrentTime())
            ? player.getCurrentTime()
            : state.position;
          const endedNaturally = actualDuration > 0
            ? actualPosition >= Math.max(0, actualDuration - END_TOLERANCE_SECONDS)
            : true;

          if (!endedNaturally) {
            set({
              isPlaying: false,
              isLoading: false,
              position: actualPosition,
              duration: actualDuration || state.duration,
              error: "Playback ended early. Tap play to retry.",
            });
            return;
          }

          if (state.repeat === "one") {
            player.seek(0);
            void player.play();
            set({ position: 0, isPlaying: true, error: undefined });
            return;
          }
          set({ isPlaying: false, position: 0 });
          void state.playNext();
        },
        onCanPlay: (duration) => {
          set((state) => ({
            duration: resolveDuration(duration, state.duration),
            isLoading: false,
          }));
        },
        onProgress: (time, duration) => {
          set((state) => ({
            position: time,
            duration: resolveDuration(duration, state.duration),
          }));
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
        queue: [],
        queueOrder: [],
        queuePosition: -1,
        getFrequencyData: () => player.getFrequencyData(),
        getSampleRate: () => player.getSampleRate(),

        playSong: async (songId: string, options) => {
          const session = useAuthStore.getState().session;
          if (!session) {
            set({ error: "Not authenticated", isLoading: false });
            return;
          }

          const requestToken = Symbol(songId);
          activeRequestToken = requestToken;
          const queueItem = options?.queueItem;

          const queuedSong = queueItem ? queueItemToSong(queueItem) : null;
          const queuedCover = queueItem?.coverArtUrl ?? getCoverArtUrl(session.client, queueItem?.coverArt);

          set({
            isLoading: true,
            error: undefined,
            position: 0,
            duration: queueItem?.duration ?? 0,
            currentSong: queuedSong ?? get().currentSong,
            coverArtUrl: queuedCover ?? get().coverArtUrl,
          });

          try {
            const qualityMissing = !queueItem?.suffix
              || typeof queueItem?.samplingRate !== "number"
              || typeof queueItem?.bitDepth !== "number";
            const needsFreshMetadata = !queueItem || get().queue.length === 0 || qualityMissing;
            const { song, coverArtUrl } = needsFreshMetadata
              ? await session.client.getSong(songId).then(({ song: fetchedSong }) => ({
                song: fetchedSong,
                coverArtUrl: getCoverArtUrl(session.client, fetchedSong.coverArt),
              }))
              : { song: queuedSong!, coverArtUrl: queuedCover };

            if (activeRequestToken !== requestToken) {
              return;
            }

            if (needsFreshMetadata && queueItem && get().queue.length > 0) {
              const { queueOrder, queuePosition, queue } = get();
              const queueIndex = queueOrder[queuePosition];
              if (typeof queueIndex === "number" && queue[queueIndex]) {
                const updatedQueue = [...queue];
                updatedQueue[queueIndex] = {
                  ...updatedQueue[queueIndex],
                  bitDepth: song.bitDepth,
                  samplingRate: song.samplingRate,
                  suffix: song.suffix ?? updatedQueue[queueIndex].suffix,
                };
                set({ queue: updatedQueue });
              }
            }

            if (get().queue.length === 0) {
              const coverUrl = coverArtUrl ?? getCoverArtUrl(session.client, song.coverArt);
              set({
                queue: [songToQueueItem(song, coverUrl)],
                queueOrder: [0],
                queuePosition: 0,
              });
            }

            const streamSongId = song.id ?? songId;
            const streamUrl = session.client.getStreamUrl(streamSongId, {
              maxBitRate: 0,
              format: "flac",
              estimateContentLength: true,
            });

            audioCache.cancelOtherPrefetches();
            const playableSource = await audioCache.getPlayableSource(
              {
                id: streamSongId,
                url: streamUrl,
                duration: song.duration,
              },
              { allowPrefetch: false },
            );

            if (activeRequestToken !== requestToken) {
              playableSource.cleanup?.();
              return;
            }

            releaseCurrentSource?.();
            releaseCurrentSource = playableSource.cleanup ?? null;
            player.stop();
            player.setSource({ id: streamSongId, url: playableSource.url, duration: song.duration });
            playableSource.cachePromise?.catch(() => undefined);

            if (activeRequestToken !== requestToken) {
              return;
            }

            await player.play();
            if (activeRequestToken !== requestToken) {
              return;
            }

            set({
              currentSong: song,
              coverArtUrl: coverArtUrl ?? getCoverArtUrl(session.client, song.coverArt),
              isPlaying: true,
              isLoading: false,
              error: undefined,
              position: 0,
              duration: song.duration ?? queueItem?.duration ?? player.getDuration(),
            });
            // Avoid parallel stream prefetches that can interrupt current playback.
            void prefetchNextInQueue(playableSource.fromCache);
            activeRequestToken = null;
          } catch (error) {
            if (activeRequestToken === requestToken) {
              releaseCurrentSource?.();
              releaseCurrentSource = null;
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
            const hasQueue = get().queue.length > 0;
            if (hasQueue) {
              await get().playFromQueue(Math.max(0, get().queuePosition === -1 ? 0 : get().queuePosition));
            }
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
          const nextTime = clampTime(time, resolveDuration(player.getDuration(), get().duration));
          player.seek(nextTime);
          set({ position: nextTime });
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
            const nextTime = clampTime(finalTime, resolveDuration(player.getDuration(), get().duration));
            player.seek(nextTime);
            set({ position: nextTime });
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
          set((state) => {
            const nextShuffle = !state.shuffle;
            if (state.queue.length === 0) {
              return { shuffle: nextShuffle };
            }
            const currentIndex = getCurrentQueueIndex(state);
            const order = createQueueOrder(state.queue.length, nextShuffle, currentIndex >= 0 ? currentIndex : 0);
            const nextPosition = order.findIndex((value) => value === currentIndex);
            return {
              shuffle: nextShuffle,
              queueOrder: order,
              queuePosition: nextPosition >= 0 ? nextPosition : 0,
            };
          });
        },

        cycleRepeat: () => {
          set((state) => {
            if (state.repeat === "off") return { repeat: "all" as RepeatMode };
            if (state.repeat === "all") return { repeat: "one" as RepeatMode };
            return { repeat: "off" as RepeatMode };
          });
        },

        setEq: (bands: ParametricEqBand[]) => {
          player.setParametricEq(bands);
        },

        setQueue: async (items: QueueItem[], startIndex = 0) => {
          if (items.length === 0) {
            player.stop();
            releaseCurrentSource?.();
            releaseCurrentSource = null;
            activeRequestToken = null;
            set({
              queue: [],
              queueOrder: [],
              queuePosition: -1,
              currentSong: null,
              coverArtUrl: undefined,
              isPlaying: false,
              isLoading: false,
              position: 0,
              duration: 0,
              error: undefined,
            });
            return;
          }

          const clampedStart = Math.min(Math.max(startIndex, 0), items.length - 1);
          const state = get();
          const order = createQueueOrder(items.length, state.shuffle, clampedStart);
          const nextPosition = order.findIndex((value) => value === clampedStart);

          set({
            queue: items,
            queueOrder: order,
            queuePosition: nextPosition >= 0 ? nextPosition : 0,
          });
          await get().playFromQueue(nextPosition >= 0 ? nextPosition : 0);
        },

        playFromQueue: async (orderIndex: number) => {
          const state = get();
          if (orderIndex < 0 || orderIndex >= state.queueOrder.length) {
            set({ isPlaying: false, isLoading: false });
            return;
          }
          const queueIndex = state.queueOrder[orderIndex];
          const item = state.queue[queueIndex];
          if (!item) {
            set({
              queuePosition: -1,
              isPlaying: false,
              isLoading: false,
              duration: 0,
              position: 0,
            });
            return;
          }
          set({ queuePosition: orderIndex, duration: item.duration ?? 0, position: 0 });
          await get().playSong(item.id, { queueItem: item });
        },

        playNext: async () => {
          const state = get();
          const hasQueue = state.queueOrder.length > 0 && state.queuePosition !== -1;
          if (!hasQueue) {
            player.pause();
            set({ isPlaying: false });
            return;
          }
          const nextOrderIndex = state.queuePosition + 1;
          if (nextOrderIndex >= state.queueOrder.length) {
            if (state.repeat === "all") {
              await get().playFromQueue(0);
            } else {
              set({ isPlaying: false, position: 0 });
            }
            return;
          }
          await get().playFromQueue(nextOrderIndex);
        },

        playPrevious: async () => {
          const state = get();
          const hasQueue = state.queueOrder.length > 0 && state.queuePosition !== -1;
          if (!hasQueue) {
            if (state.currentSong) {
              player.seek(0);
              set({ position: 0 });
            }
            return;
          }
          const prevOrderIndex = state.queuePosition - 1;
          if (prevOrderIndex >= 0) {
            await get().playFromQueue(prevOrderIndex);
            return;
          }
          if (state.repeat === "all" && state.queueOrder.length > 0) {
            await get().playFromQueue(state.queueOrder.length - 1);
            return;
          }
          player.seek(0);
          set({ position: 0 });
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

export const playSong = async (songId: string, options?: { queueItem?: QueueItem }): Promise<void> => {
  await usePlaybackStore.getState().playSong(songId, options);
};
