import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SubsonicSong } from "../types/subsonic";
import { QueueItem } from "../types/playback";
import { useAuthStore } from "./authStore";
import { HiResAudioPlayer, ParametricEqBand } from "../services/audio/player";
import { audioCache } from "../services/audio/audioCache";
import { queueItemToSong } from "../utils/playbackMapping";
import { getCoverArtUrl } from "../utils/mediaImages";
import { usePlaybackSettingsStore } from "./playbackSettingsStore";

type RepeatMode = "off" | "one" | "all";
type QueueSource = "priority" | "regular";

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
  // Priority queue: explicit user "Play next"/"Add to queue" actions.
  queue: QueueItem[];
  queueOrder: number[];
  queuePosition: number;
  // Regular queue: full replacement queue from "Play" actions.
  playTargetItem?: string;
  regularQueue: QueueItem[];
  regularQueueOrder: number[];
  regularQueuePosition: number;
  currentSource: QueueSource | null;
  getFrequencyData: () => Uint8Array | null;
  getTimeDomainData: () => Float32Array | null;
  getSampleRate: () => number | null;
  playSong: (songId: string, options?: { queueItem?: QueueItem; source?: QueueSource }) => Promise<boolean>;
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
  setEq: (eq: { bands: ParametricEqBand[]; preampDb?: number }) => void;
  applyGaplessSettings: () => void;
  setQueue: (
    items: QueueItem[],
    startIndex?: number,
    options?: { playTargetItem?: string },
  ) => Promise<void>;
  addToQueue: (items: QueueItem[]) => void;
  addToQueueFront: (items: QueueItem[]) => void;
  moveQueueItem: (fromOrderIndex: number, toOrderIndex: number) => void;
  removeFromQueue: (orderIndex: number) => void;
  playFromQueue: (orderIndex: number) => Promise<boolean>;
  playFromRegularQueue: (orderIndex: number) => Promise<boolean>;
  playNext: () => Promise<void>;
  playPrevious: () => Promise<void>;
}

const DEFAULT_VOLUME = 0.85;
// when crossfade slider is 0 but gapless is on, a tiny overlap smooths the boundary instead of a hard cut
const GAPLESS_MICRO_CROSSFADE_SECONDS = 0.25;
const END_TOLERANCE_SECONDS = 1.5;
const MAX_CONSECUTIVE_FAILURES = 3;
const player = new HiResAudioPlayer();
player.setVolume(DEFAULT_VOLUME);

let activeRequestToken: symbol | null = null;
let scrubWasPlaying = false;
let releaseCurrentSource: (() => void) | null = null;
let releaseNextSource: (() => void) | null = null;
let preloadToken = 0;
let consecutiveFailures = 0;

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
      const getCurrentRegularQueueIndex = (state: PlaybackState): number => {
        const queueIndex = state.regularQueueOrder[state.regularQueuePosition];
        return typeof queueIndex === "number" ? queueIndex : -1;
      };

      const getNextRegularOrderIndex = (state: PlaybackState): number => {
        return state.regularQueuePosition >= 0 ? state.regularQueuePosition + 1 : 0;
      };

      const getNextPlayableItem = (state: PlaybackState): QueueItem | null => {
        const nextPriorityIndex = state.queueOrder[0];
        if (typeof nextPriorityIndex === "number") {
          const nextPriority = state.queue[nextPriorityIndex];
          if (nextPriority) {
            return nextPriority;
          }
        }

        const nextRegularOrderIndex = getNextRegularOrderIndex(state);
        const nextRegularIndex = state.regularQueueOrder[nextRegularOrderIndex];
        if (typeof nextRegularIndex === "number") {
          return state.regularQueue[nextRegularIndex] ?? null;
        }
        if (state.repeat === "all" && state.regularQueueOrder.length > 0) {
          const firstIndex = state.regularQueueOrder[0];
          return state.regularQueue[firstIndex] ?? null;
        }
        return null;
      };

      interface NextItemConsumption {
        item: QueueItem;
        source: QueueSource;
        patch: Partial<PlaybackState>;
      }

      const consumeNextItem = (state: PlaybackState): NextItemConsumption | null => {
        const priorityQueueIndex = state.queueOrder[0];
        if (typeof priorityQueueIndex === "number" && state.queue[priorityQueueIndex]) {
          const item = state.queue[priorityQueueIndex];
          const nextQueue = state.queue.filter((_, index) => index !== priorityQueueIndex);
          const nextOrder = state.queueOrder
            .filter((_, index) => index !== 0)
            .map((index) => (index > priorityQueueIndex ? index - 1 : index));
          return {
            item,
            source: "priority",
            patch: {
              queue: nextQueue,
              queueOrder: nextOrder,
              queuePosition: -1,
              currentSource: "priority",
            },
          };
        }

        const nextRegularOrderIndex = getNextRegularOrderIndex(state);
        let targetOrderIndex = -1;
        if (nextRegularOrderIndex < state.regularQueueOrder.length) {
          targetOrderIndex = nextRegularOrderIndex;
        } else if (state.repeat === "all" && state.regularQueueOrder.length > 0) {
          targetOrderIndex = 0;
        }
        if (targetOrderIndex === -1) {
          return null;
        }

        const queueIndex = state.regularQueueOrder[targetOrderIndex];
        const item = state.regularQueue[queueIndex];
        if (!item) {
          return null;
        }
        return {
          item,
          source: "regular",
          patch: {
            regularQueuePosition: targetOrderIndex,
            currentSource: "regular",
          },
        };
      };

      const buildStreamUrl = (songId: string): string | null => {
        const session = useAuthStore.getState().session;
        if (!session) return null;
        return session.client.getStreamUrl(songId, {
          maxBitRate: 0,
          format: "flac",
          estimateContentLength: true,
        });
      };

      const syncGaplessPreload = async (): Promise<void> => {
        const token = ++preloadToken;
        const state = get();
        const { gaplessEnabled } = usePlaybackSettingsStore.getState();
        let nextItem = !gaplessEnabled || state.repeat === "one" || !state.currentSong
          ? null
          : getNextPlayableItem(state);
        if (nextItem && nextItem.id === state.currentSong?.id) {
          nextItem = null;
        }

        if (!nextItem) {
          player.clearPreload();
          releaseNextSource?.();
          releaseNextSource = null;
          return;
        }

        if (player.getPreloadedTrackId() === nextItem.id) {
          return;
        }

        const streamUrl = buildStreamUrl(nextItem.id);
        if (!streamUrl) return;

        try {
          // cache the next track first so the standby element buffers from memory rather than racing the network at the boundary
          await audioCache.ensureCached({
            id: nextItem.id,
            url: streamUrl,
            duration: nextItem.duration,
          });
          if (token !== preloadToken) return;

          const playable = await audioCache.getPlayableSource(
            { id: nextItem.id, url: streamUrl, duration: nextItem.duration },
            { allowPrefetch: false },
          );

          if (token !== preloadToken) {
            playable.cleanup?.();
            return;
          }

          releaseNextSource?.();
          releaseNextSource = playable.cleanup ?? null;
          player.preloadNext({ id: nextItem.id, url: playable.url, duration: nextItem.duration });
        } catch (error) {
          console.debug("Gapless preload failed", error);
        }
      };

      const startQueueIfIdle = (): void => {
        const state = get();
        const idle = !state.currentSong
          || (!state.isPlaying && !state.isLoading && state.currentSource === null);
        if (idle && state.queueOrder.length > 0) {
          void state.playFromQueue(0);
          return;
        }
        void syncGaplessPreload();
      };

      const prefetchNextInQueue = async (allowNetwork: boolean) => {
        if (!allowNetwork) return;
        const session = useAuthStore.getState().session;
        if (!session) return;

        const state = get();
        const nextItem = getNextPlayableItem(state);
        if (!nextItem) return;

        try {
          const streamUrl = session.client.getStreamUrl(nextItem.id, {
            maxBitRate: 0,
            format: "flac",
            estimateContentLength: true,
          });
          await audioCache.ensureCached({
            id: nextItem.id,
            url: streamUrl,
            duration: nextItem.duration,
          });
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
        onAutoAdvance: (trackId) => {
          const consumption = consumeNextItem(get());
          if (!consumption || consumption.item.id !== trackId) {
            player.stop();
            player.clearPreload();
            void get().playNext();
            return;
          }

          const session = useAuthStore.getState().session;
          const { item, patch } = consumption;
          releaseCurrentSource?.();
          releaseCurrentSource = releaseNextSource;
          releaseNextSource = null;
          consecutiveFailures = 0;

          set({
            ...patch,
            currentSong: queueItemToSong(item),
            coverArtUrl: item.coverArtUrl
              ?? (session ? getCoverArtUrl(session.client, item.coverArt) : undefined),
            isPlaying: true,
            isLoading: false,
            error: undefined,
            position: 0,
            duration: item.duration ?? player.getDuration(),
          });

          void syncGaplessPreload();
          void prefetchNextInQueue(true);
        },
        onCanPlay: (duration) => {
          set((state) => ({
            duration: resolveDuration(duration, state.duration),
            isLoading: false,
          }));
        },
        onWaiting: () => {
          set({ isLoading: true });
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
        playTargetItem: undefined,
        queue: [],
        queueOrder: [],
        queuePosition: -1,
        regularQueue: [],
        regularQueueOrder: [],
        regularQueuePosition: -1,
        currentSource: null,
        getFrequencyData: () => player.getFrequencyData(),
        getTimeDomainData: () => player.getTimeDomainData(),
        getSampleRate: () => player.getSampleRate(),

        playSong: async (songId: string, options) => {
          const session = useAuthStore.getState().session;
          if (!session) {
            set({ error: "Not authenticated", isLoading: false });
            return false;
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
            const needsFreshMetadata = !queueItem || qualityMissing;
            const { song, coverArtUrl } = needsFreshMetadata
              ? await session.client.getSong(songId).then(({ song: fetchedSong }) => ({
                song: fetchedSong,
                coverArtUrl: getCoverArtUrl(session.client, fetchedSong.coverArt),
              }))
              : { song: queuedSong!, coverArtUrl: queuedCover };

            if (activeRequestToken !== requestToken) {
              return true;
            }

            if (needsFreshMetadata && queueItem && options?.source === "regular" && get().regularQueue.length > 0) {
              const { regularQueueOrder, regularQueuePosition, regularQueue } = get();
              const queueIndex = regularQueueOrder[regularQueuePosition];
              if (typeof queueIndex === "number" && regularQueue[queueIndex]) {
                const updatedQueue = [...regularQueue];
                updatedQueue[queueIndex] = {
                  ...updatedQueue[queueIndex],
                  bitDepth: song.bitDepth,
                  samplingRate: song.samplingRate,
                  suffix: song.suffix ?? updatedQueue[queueIndex].suffix,
                };
                set({ regularQueue: updatedQueue });
              }
            }

            const streamSongId = song.id ?? songId;
            const streamUrl = session.client.getStreamUrl(streamSongId, {
              maxBitRate: 0,
              format: "flac",
              estimateContentLength: true,
            });

            const usePreloaded = player.getPreloadedTrackId() === streamSongId;
            if (usePreloaded) {
              releaseCurrentSource?.();
              releaseCurrentSource = releaseNextSource;
              releaseNextSource = null;
              player.setSource({ id: streamSongId, url: streamUrl, duration: song.duration });
            } else {
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
                return true;
              }

              releaseCurrentSource?.();
              releaseCurrentSource = playableSource.cleanup ?? null;
              player.stop();
              player.setSource({ id: streamSongId, url: playableSource.url, duration: song.duration });
              playableSource.cachePromise?.catch(() => undefined);
            }

            if (activeRequestToken !== requestToken) {
              return true;
            }

            await player.play();
            if (activeRequestToken !== requestToken) {
              return true;
            }

            set({
              currentSong: song,
              coverArtUrl: coverArtUrl ?? getCoverArtUrl(session.client, song.coverArt),
              currentSource: options?.source ?? get().currentSource,
              isPlaying: true,
              isLoading: false,
              error: undefined,
              position: 0,
              duration: song.duration ?? queueItem?.duration ?? player.getDuration(),
            });
            consecutiveFailures = 0;
            void syncGaplessPreload();
            void prefetchNextInQueue(true);
            activeRequestToken = null;
            return true;
          } catch (error) {
            if (activeRequestToken !== requestToken) {
              return true;
            }
            releaseCurrentSource?.();
            releaseCurrentSource = null;
            set({
              isLoading: false,
              isPlaying: false,
              error: error instanceof Error ? error.message : "Unable to play song",
            });
            activeRequestToken = null;
            return false;
          }
        },

        togglePlayPause: async () => {
          const { isPlaying, currentSong } = get();
          if (!currentSong) {
            const state = get();
            if (state.queue.length > 0) {
              await state.playFromQueue(0);
            } else if (state.regularQueue.length > 0) {
              await state.playFromRegularQueue(Math.max(0, state.regularQueuePosition === -1 ? 0 : state.regularQueuePosition));
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
              const resumeAt = get().position;
              const retried = await get().playSong(currentSong.id, {
                queueItem: undefined,
                source: get().currentSource ?? undefined,
              });
              if (retried && resumeAt > 0) {
                get().seek(resumeAt);
              }
              if (!retried) {
                set({
                  isPlaying: false,
                  error: error instanceof Error ? error.message : "Unable to resume playback",
                });
              }
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
          player.setScrubbing(true);
          set({ isScrubbing: true });
          if (!scrubWasPlaying && get().currentSong) {
            player.play().catch(() => undefined);
            set({ isPlaying: true });
          }
        },

        endScrub: (finalTime?: number) => {
          // re-enable crossfade detection first; if the release lands inside the fade window, the next frame catches it up
          player.setScrubbing(false);
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
            if (state.regularQueue.length === 0) {
              return { shuffle: nextShuffle };
            }
            const currentIndex = getCurrentRegularQueueIndex(state);
            const order = createQueueOrder(state.regularQueue.length, nextShuffle, currentIndex >= 0 ? currentIndex : 0);
            const nextPosition = order.findIndex((value) => value === currentIndex);
            return {
              shuffle: nextShuffle,
              regularQueueOrder: order,
              regularQueuePosition: nextPosition >= 0 ? nextPosition : state.regularQueuePosition,
            };
          });
          void syncGaplessPreload();
        },

        cycleRepeat: () => {
          set((state) => {
            if (state.repeat === "off") return { repeat: "all" as RepeatMode };
            if (state.repeat === "all") return { repeat: "one" as RepeatMode };
            return { repeat: "off" as RepeatMode };
          });
          void syncGaplessPreload();
        },

        setEq: (eq) => {
          player.setParametricEq(eq.bands, eq.preampDb ?? 0);
        },

        applyGaplessSettings: () => {
          const { gaplessEnabled, crossfadeDuration } = usePlaybackSettingsStore.getState();
          const effectiveCrossfade = gaplessEnabled
            ? (crossfadeDuration > 0 ? crossfadeDuration : GAPLESS_MICRO_CROSSFADE_SECONDS)
            : 0;
          player.setCrossfadeDuration(effectiveCrossfade);
          void syncGaplessPreload();
        },

        setQueue: async (items: QueueItem[], startIndex = 0, options) => {
          if (items.length === 0) {
            player.stop();
            player.clearPreload();
            releaseCurrentSource?.();
            releaseCurrentSource = null;
            releaseNextSource?.();
            releaseNextSource = null;
            activeRequestToken = null;
            set({
              queue: [],
              queueOrder: [],
              queuePosition: -1,
              playTargetItem: undefined,
              regularQueue: [],
              regularQueueOrder: [],
              regularQueuePosition: -1,
              currentSource: null,
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
            queue: [],
            queueOrder: [],
            queuePosition: -1,
            playTargetItem: options?.playTargetItem,
            regularQueue: items,
            regularQueueOrder: order,
            regularQueuePosition: nextPosition >= 0 ? nextPosition : 0,
            currentSource: "regular",
          });
          await get().playFromRegularQueue(nextPosition >= 0 ? nextPosition : 0);
        },

        addToQueue: (items: QueueItem[]) => {
          if (items.length === 0) return;
          set((state) => {
            const baseQueue = state.queue;
            const newQueue = [...baseQueue, ...items];
            const newIndices = items.map((_, idx) => baseQueue.length + idx);

            if (state.queueOrder.length === 0) {
              const order = Array.from({ length: newQueue.length }, (_, index) => index);
              return {
                queue: newQueue,
                queueOrder: order,
                queuePosition: -1,
              };
            }

            const appended = newIndices;
            return {
              queue: newQueue,
              queueOrder: [...state.queueOrder, ...appended],
              queuePosition: -1,
            };
          });
          startQueueIfIdle();
        },

        addToQueueFront: (items: QueueItem[]) => {
          if (items.length === 0) return;
          set((state) => {
            const baseQueue = state.queue;
            const newQueue = [...baseQueue, ...items];
            const newIndices = items.map((_, idx) => baseQueue.length + idx);

            if (state.queueOrder.length === 0) {
              const order = Array.from({ length: newQueue.length }, (_, index) => index);
              return {
                queue: newQueue,
                queueOrder: order,
                queuePosition: -1,
              };
            }

            const insertionIndex = 0;
            const order = [...state.queueOrder];
            order.splice(insertionIndex, 0, ...newIndices);
            return {
              queue: newQueue,
              queueOrder: order,
              queuePosition: -1,
            };
          });
          startQueueIfIdle();
        },

        moveQueueItem: (fromOrderIndex: number, toOrderIndex: number) => {
          set((state) => {
            if (state.queueOrder.length === 0) {
              return state;
            }
            const boundedFrom = Math.max(0, Math.min(fromOrderIndex, state.queueOrder.length - 1));
            const boundedTo = Math.max(0, Math.min(toOrderIndex, state.queueOrder.length - 1));
            if (boundedFrom === boundedTo) {
              return state;
            }

            const order = [...state.queueOrder];
            const [moved] = order.splice(boundedFrom, 1);
            order.splice(boundedTo, 0, moved);

            return {
              queueOrder: order,
              queuePosition: -1,
            };
          });
          void syncGaplessPreload();
        },

        removeFromQueue: (orderIndex: number) => {
          const state = get();
          if (state.queueOrder.length === 0) return;

          const boundedIndex = Math.max(0, Math.min(orderIndex, state.queueOrder.length - 1));
          const queueIndex = state.queueOrder[boundedIndex];
          if (typeof queueIndex !== "number") return;

          const nextQueue = state.queue.filter((_, index) => index !== queueIndex);
          const nextOrder = state.queueOrder
            .filter((_, index) => index !== boundedIndex)
            .map((index) => (index > queueIndex ? index - 1 : index));

          set({
            queue: nextQueue,
            queueOrder: nextOrder,
            queuePosition: -1,
          });
          void syncGaplessPreload();
        },

        playFromQueue: async (orderIndex: number) => {
          const state = get();
          if (orderIndex < 0 || orderIndex >= state.queueOrder.length) {
            set({ isPlaying: false, isLoading: false });
            return false;
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
            return false;
          }

          const nextQueue = state.queue.filter((_, index) => index !== queueIndex);
          const nextOrder = state.queueOrder
            .filter((_, index) => index !== orderIndex)
            .map((index) => (index > queueIndex ? index - 1 : index));

          set({
            queue: nextQueue,
            queueOrder: nextOrder,
            queuePosition: -1,
            currentSource: "priority",
            duration: item.duration ?? 0,
            position: 0,
          });
          return get().playSong(item.id, { queueItem: item, source: "priority" });
        },

        playFromRegularQueue: async (orderIndex: number) => {
          const state = get();
          if (orderIndex < 0 || orderIndex >= state.regularQueueOrder.length) {
            set({ isPlaying: false, isLoading: false });
            return false;
          }

          const queueIndex = state.regularQueueOrder[orderIndex];
          const item = state.regularQueue[queueIndex];
          if (!item) {
            set({
              regularQueuePosition: -1,
              isPlaying: false,
              isLoading: false,
              duration: 0,
              position: 0,
            });
            return false;
          }

          set({
            regularQueuePosition: orderIndex,
            currentSource: "regular",
            duration: item.duration ?? 0,
            position: 0,
          });
          return get().playSong(item.id, { queueItem: item, source: "regular" });
        },

        playNext: async () => {
          const consumption = consumeNextItem(get());
          if (!consumption) {
            player.pause();
            set({ isPlaying: false, position: 0, currentSource: null, playTargetItem: undefined });
            void syncGaplessPreload();
            return;
          }

          const { item, source, patch } = consumption;
          set({
            ...patch,
            duration: item.duration ?? 0,
            position: 0,
          });
          const ok = await get().playSong(item.id, { queueItem: item, source });
          if (!ok && get().error !== "Not authenticated") {
            consecutiveFailures += 1;
            if (consecutiveFailures < MAX_CONSECUTIVE_FAILURES) {
              await get().playNext();
            } else {
              consecutiveFailures = 0;
            }
          }
        },

        playPrevious: async () => {
          const state = get();
          if (state.currentSong && state.position > 3) {
            player.seek(0);
            set({ position: 0 });
            return;
          }
          if (state.currentSource !== "regular") {
            if (state.currentSong) {
              player.seek(0);
              set({ position: 0 });
            }
            return;
          }

          const hasRegularQueue = state.regularQueueOrder.length > 0 && state.regularQueuePosition !== -1;
          if (!hasRegularQueue) {
            if (state.currentSong) {
              player.seek(0);
              set({ position: 0 });
            }
            return;
          }

          const prevOrderIndex = state.regularQueuePosition - 1;
          if (prevOrderIndex >= 0) {
            await get().playFromRegularQueue(prevOrderIndex);
            return;
          }

          if (state.repeat === "all" && state.regularQueueOrder.length > 0) {
            await get().playFromRegularQueue(state.regularQueueOrder.length - 1);
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

usePlaybackStore.getState().applyGaplessSettings();
usePlaybackSettingsStore.subscribe(() => {
  usePlaybackStore.getState().applyGaplessSettings();
});

export const playSong = async (songId: string, options?: { queueItem?: QueueItem; source?: QueueSource }): Promise<void> => {
  await usePlaybackStore.getState().playSong(songId, options);
};
