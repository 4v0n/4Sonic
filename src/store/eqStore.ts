import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { DataPoint } from "../utils/fr";

export const TEN_BAND_FREQUENCIES = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000] as const;

export type EqMode = "simple" | "ten-band" | "advanced";
export type EqPreampMode = "auto" | "manual";

export type EqBandSetting = {
  freq: number;
  gain: number;
  q: number;
  enabled: boolean;
};

export type EqProfile = {
  id: string;
  name: string;
  mode: EqMode;
  preampMode: EqPreampMode;
  preamp: number;
  bands: EqBandSetting[];
  measurementData: DataPoint[] | null;
  measurementFileName?: string;
  createdAt: number;
  updatedAt: number;
};

type EqState = {
  profiles: EqProfile[];
  activeProfileId: string;
  setActiveProfile: (id: string) => void;
  createProfile: (name?: string) => void;
  updateActiveProfileName: (name: string) => void;
  deleteActiveProfile: () => void;
  setActiveProfileMode: (mode: EqMode) => void;
  setActiveProfilePreampMode: (mode: EqPreampMode) => void;
  setActiveProfilePreamp: (preamp: number) => void;
  setActiveProfileBandGain: (frequency: number, gain: number) => void;
  setActiveProfileMeasurement: (data: DataPoint[], fileName?: string) => void;
  clearActiveProfileMeasurement: () => void;
  resetActiveProfileBands: () => void;
};

const DEFAULT_Q = 1.4;
const DEFAULT_PROFILE_NAME = "Default";
const MIN_GAIN = -12;
const MAX_GAIN = 12;
const MIN_PREAMP = -24;
const MAX_PREAMP = 24;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const calculateAutoPreamp = (bands: EqBandSetting[]): number => {
  const enabledBands = bands.filter((band) => band.enabled);
  if (enabledBands.length === 0) return 0;
  const maxBoost = enabledBands.reduce((max, band) => Math.max(max, band.gain), 0);
  return clamp(-Math.max(0, maxBoost), MIN_PREAMP, 0);
};

export const resolveProfilePreamp = (profile: EqProfile): number => (
  profile.preampMode === "auto" ? calculateAutoPreamp(profile.bands) : profile.preamp
);

const createId = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `eq-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
};

const createDefaultBands = (): EqBandSetting[] => (
  TEN_BAND_FREQUENCIES.map((freq) => ({
    freq,
    gain: 0,
    q: DEFAULT_Q,
    enabled: true,
  }))
);

const cloneBands = (bands: EqBandSetting[]): EqBandSetting[] => bands.map((band) => ({ ...band }));

const cloneMeasurement = (data: DataPoint[] | null): DataPoint[] | null => (
  data ? data.map((point) => ({ ...point })) : null
);

const createProfile = (name: string, baseProfile?: EqProfile): EqProfile => {
  const now = Date.now();

  if (baseProfile) {
    return {
      ...baseProfile,
      id: createId(),
      name,
      bands: cloneBands(baseProfile.bands),
      measurementData: cloneMeasurement(baseProfile.measurementData),
      createdAt: now,
      updatedAt: now,
    };
  }

  return {
    id: createId(),
    name,
    mode: "ten-band",
    preampMode: "auto",
    preamp: 0,
    bands: createDefaultBands(),
    measurementData: null,
    measurementFileName: undefined,
    createdAt: now,
    updatedAt: now,
  };
};

const getActiveProfile = (profiles: EqProfile[], activeProfileId: string): EqProfile | undefined => (
  profiles.find((profile) => profile.id === activeProfileId)
);

const updateActiveProfileInList = (
  profiles: EqProfile[],
  activeProfileId: string,
  updater: (profile: EqProfile) => EqProfile,
): EqProfile[] => (
  profiles.map((profile) => (profile.id === activeProfileId ? updater(profile) : profile))
);

const initialProfile = createProfile(DEFAULT_PROFILE_NAME);

export const useEqStore = create<EqState>()(
  persist(
    (set) => ({
      profiles: [initialProfile],
      activeProfileId: initialProfile.id,

      setActiveProfile: (id) => {
        set((state) => {
          if (!state.profiles.some((profile) => profile.id === id)) return state;
          return { activeProfileId: id };
        });
      },

      createProfile: (name) => {
        set((state) => {
          const base = getActiveProfile(state.profiles, state.activeProfileId);
          const normalizedName = name?.trim() || `Profile ${state.profiles.length + 1}`;
          const nextProfile = createProfile(normalizedName, base);
          return {
            profiles: [...state.profiles, nextProfile],
            activeProfileId: nextProfile.id,
          };
        });
      },

      updateActiveProfileName: (name) => {
        const trimmed = name.trim();
        if (!trimmed) return;

        set((state) => ({
          profiles: updateActiveProfileInList(state.profiles, state.activeProfileId, (profile) => ({
            ...profile,
            name: trimmed,
            updatedAt: Date.now(),
          })),
        }));
      },

      deleteActiveProfile: () => {
        set((state) => {
          if (state.profiles.length <= 1) return state;

          const remaining = state.profiles.filter((profile) => profile.id !== state.activeProfileId);
          const nextActiveId = remaining[0]?.id ?? state.activeProfileId;

          return {
            profiles: remaining,
            activeProfileId: nextActiveId,
          };
        });
      },

      setActiveProfileMode: (mode) => {
        set((state) => ({
          profiles: updateActiveProfileInList(state.profiles, state.activeProfileId, (profile) => ({
            ...profile,
            mode,
            updatedAt: Date.now(),
          })),
        }));
      },

      setActiveProfilePreampMode: (mode) => {
        set((state) => ({
          profiles: updateActiveProfileInList(state.profiles, state.activeProfileId, (profile) => ({
            ...profile,
            preampMode: mode,
            updatedAt: Date.now(),
          })),
        }));
      },

      setActiveProfilePreamp: (preamp) => {
        set((state) => ({
          profiles: updateActiveProfileInList(state.profiles, state.activeProfileId, (profile) => ({
            ...profile,
            preamp: clamp(preamp, MIN_PREAMP, MAX_PREAMP),
            updatedAt: Date.now(),
          })),
        }));
      },

      setActiveProfileBandGain: (frequency, gain) => {
        set((state) => ({
          profiles: updateActiveProfileInList(state.profiles, state.activeProfileId, (profile) => ({
            ...profile,
            bands: profile.bands.map((band) => (
              band.freq === frequency
                ? { ...band, gain: clamp(gain, MIN_GAIN, MAX_GAIN) }
                : band
            )),
            updatedAt: Date.now(),
          })),
        }));
      },

      setActiveProfileMeasurement: (data, fileName) => {
        set((state) => ({
          profiles: updateActiveProfileInList(state.profiles, state.activeProfileId, (profile) => ({
            ...profile,
            measurementData: cloneMeasurement(data),
            measurementFileName: fileName,
            updatedAt: Date.now(),
          })),
        }));
      },

      clearActiveProfileMeasurement: () => {
        set((state) => ({
          profiles: updateActiveProfileInList(state.profiles, state.activeProfileId, (profile) => ({
            ...profile,
            measurementData: null,
            measurementFileName: undefined,
            updatedAt: Date.now(),
          })),
        }));
      },

      resetActiveProfileBands: () => {
        set((state) => ({
          profiles: updateActiveProfileInList(state.profiles, state.activeProfileId, (profile) => ({
            ...profile,
            bands: createDefaultBands(),
            preamp: 0,
            updatedAt: Date.now(),
          })),
        }));
      },
    }),
    {
      name: "eq-profiles",
      version: 2,
      migrate: (persistedState: unknown) => {
        const state = persistedState as {
          profiles?: EqProfile[];
          activeProfileId?: string;
        };

        const profiles = (state?.profiles ?? [initialProfile]).map((profile) => ({
          ...profile,
          preampMode: profile.preampMode ?? "auto",
        }));

        const activeProfileId = profiles.some((profile) => profile.id === state?.activeProfileId)
          ? (state?.activeProfileId as string)
          : profiles[0].id;

        return {
          ...state,
          profiles,
          activeProfileId,
        };
      },
      partialize: (state) => ({
        profiles: state.profiles,
        activeProfileId: state.activeProfileId,
      }),
    },
  ),
);
