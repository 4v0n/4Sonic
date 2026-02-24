import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { DataPoint } from "../utils/fr";

export const TEN_BAND_FREQUENCIES = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000] as const;
export const SIMPLE_EQ_GAIN_LIMIT = 12;
const SIMPLE_EQ_BYPASS_EPSILON = 0.05;
const DEFAULT_SIMPLE_Q = 0.71;

export const SIMPLE_EQ_CONTROLS = [
  {
    id: "bass",
    label: "Bass",
    minLabel: "Less bass",
    maxLabel: "More bass",
    description: "Slides from less bass to more bass.",
    frequency: 150,
    q: DEFAULT_SIMPLE_Q,
    type: "lowshelf",
  },
  {
    id: "warmth",
    label: "Warmth",
    minLabel: "Clean",
    maxLabel: "Rich",
    description: "Slides from clean to rich.",
    frequency: 250,
    q: DEFAULT_SIMPLE_Q,
    type: "peaking",
  },
  {
    id: "intimacy",
    label: "Intimacy",
    minLabel: "Spacious",
    maxLabel: "Intimate",
    description: "Slides from large/spacious to intimate.",
    frequency: 1500,
    q: DEFAULT_SIMPLE_Q,
    type: "peaking",
  },
  {
    id: "treble",
    label: "Treble",
    minLabel: "Laid back",
    maxLabel: "Resolute",
    description: "Slides from laid back to resolute.",
    frequency: 6000,
    q: DEFAULT_SIMPLE_Q,
    type: "highshelf",
  },
] as const;

export type EqSimpleControlId = (typeof SIMPLE_EQ_CONTROLS)[number]["id"];
export type EqSimpleControls = Record<EqSimpleControlId, number>;
export type EqFilterType = "peaking" | "lowshelf" | "highshelf";

export type EqMode = "simple" | "ten-band" | "advanced";
export type EqPreampMode = "auto" | "manual";

export type EqBandSetting = {
  freq: number;
  gain: number;
  q: number;
  enabled: boolean;
  type: EqFilterType;
};

export type EqProfile = {
  id: string;
  name: string;
  mode: EqMode;
  preampMode: EqPreampMode;
  preamp: number;
  bands: EqBandSetting[];
  simpleControls: EqSimpleControls;
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
  setActiveProfileSimpleControlGain: (control: EqSimpleControlId, gain: number) => void;
  setActiveProfileMeasurement: (data: DataPoint[], fileName?: string) => void;
  clearActiveProfileMeasurement: () => void;
  resetActiveProfileBands: () => void;
};

const DEFAULT_Q = 1.4;
const DEFAULT_PROFILE_NAME = "Default";
const MIN_GAIN = -SIMPLE_EQ_GAIN_LIMIT;
const MAX_GAIN = SIMPLE_EQ_GAIN_LIMIT;
const MIN_PREAMP = -24;
const MAX_PREAMP = 24;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const normalizeFilterType = (type: unknown): EqFilterType => {
  if (type === "lowshelf" || type === "highshelf" || type === "peaking") {
    return type;
  }
  return "peaking";
};

const createDefaultSimpleControls = (): EqSimpleControls => ({
  bass: 0,
  warmth: 0,
  intimacy: 0,
  treble: 0,
});

const normalizeSimpleControls = (controls: Partial<Record<EqSimpleControlId, number>> | undefined): EqSimpleControls => ({
  bass: clamp(controls?.bass ?? 0, MIN_GAIN, MAX_GAIN),
  warmth: clamp(controls?.warmth ?? 0, MIN_GAIN, MAX_GAIN),
  intimacy: clamp(controls?.intimacy ?? 0, MIN_GAIN, MAX_GAIN),
  treble: clamp(controls?.treble ?? 0, MIN_GAIN, MAX_GAIN),
});

const createSimpleModeBands = (simpleControls: EqSimpleControls): EqBandSetting[] => (
  SIMPLE_EQ_CONTROLS.map((control) => {
    const gain = clamp(simpleControls[control.id], MIN_GAIN, MAX_GAIN);
    return {
      freq: control.frequency,
      gain,
      q: control.q,
      enabled: Math.abs(gain) > SIMPLE_EQ_BYPASS_EPSILON,
      type: control.type,
    };
  })
);

const cloneBands = (bands: EqBandSetting[]): EqBandSetting[] => bands.map((band) => ({ ...band }));

const cloneSimpleControls = (controls: EqSimpleControls): EqSimpleControls => ({ ...controls });

export const resolveProfileBands = (profile: EqProfile): EqBandSetting[] => {
  if (profile.mode === "simple") {
    return createSimpleModeBands(profile.simpleControls);
  }
  return cloneBands(profile.bands);
};

export const calculateAutoPreamp = (bands: EqBandSetting[]): number => {
  const enabledBands = bands.filter((band) => band.enabled);
  if (enabledBands.length === 0) return 0;
  const maxBoost = enabledBands.reduce((max, band) => Math.max(max, band.gain), 0);
  return clamp(-Math.max(0, maxBoost), MIN_PREAMP, 0);
};

export const resolveProfilePreamp = (profile: EqProfile): number => (
  profile.preampMode === "auto" ? calculateAutoPreamp(resolveProfileBands(profile)) : profile.preamp
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
    type: "peaking",
  }))
);

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
      simpleControls: cloneSimpleControls(baseProfile.simpleControls),
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
    simpleControls: createDefaultSimpleControls(),
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

      setActiveProfileSimpleControlGain: (control, gain) => {
        set((state) => ({
          profiles: updateActiveProfileInList(state.profiles, state.activeProfileId, (profile) => ({
            ...profile,
            simpleControls: {
              ...profile.simpleControls,
              [control]: clamp(gain, MIN_GAIN, MAX_GAIN),
            },
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
            simpleControls: createDefaultSimpleControls(),
            preamp: 0,
            updatedAt: Date.now(),
          })),
        }));
      },
    }),
    {
      name: "eq-profiles",
      version: 3,
      migrate: (persistedState: unknown) => {
        const state = persistedState as {
          profiles?: Array<Partial<EqProfile>>;
          activeProfileId?: string;
        };

        const fallbackProfiles = state?.profiles && state.profiles.length > 0 ? state.profiles : [initialProfile];
        const profiles = fallbackProfiles.map((profile) => ({
          id: profile.id ?? createId(),
          name: profile.name ?? DEFAULT_PROFILE_NAME,
          mode: profile.mode ?? "ten-band",
          preampMode: profile.preampMode ?? "auto",
          preamp: clamp(profile.preamp ?? 0, MIN_PREAMP, MAX_PREAMP),
          bands: (profile.bands ?? createDefaultBands()).map((band) => ({
            freq: band.freq ?? 1000,
            gain: clamp(band.gain ?? 0, MIN_GAIN, MAX_GAIN),
            q: band.q ?? DEFAULT_Q,
            enabled: band.enabled ?? true,
            type: normalizeFilterType(band.type),
          })),
          simpleControls: normalizeSimpleControls(profile.simpleControls),
          measurementData: cloneMeasurement(profile.measurementData ?? null),
          measurementFileName: profile.measurementFileName,
          createdAt: profile.createdAt ?? Date.now(),
          updatedAt: profile.updatedAt ?? Date.now(),
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
