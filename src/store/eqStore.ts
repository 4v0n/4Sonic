import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { DataPoint } from "../utils/fr";

export const TEN_BAND_FREQUENCIES = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000] as const;
export const SIMPLE_EQ_GAIN_LIMIT = 12;
export const ADVANCED_EQ_GAIN_LIMIT = 24;
export const EQ_MIN_FREQUENCY = 20;
export const EQ_MAX_FREQUENCY = 24000;
export const EQ_MIN_Q = 0.1;
export const EQ_MAX_Q = 20;
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
  id: string;
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
  tenBandBands: EqBandSetting[];
  advancedBands: EqBandSetting[];
  simpleControls: EqSimpleControls;
  measurementData: DataPoint[] | null;
  measurementFileName?: string;
  referenceData: DataPoint[] | null;
  referenceFileName?: string;
  flattenReference: boolean;
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
  setActiveProfileAdvancedBand: (bandId: string, updates: Partial<Omit<EqBandSetting, "id">>) => void;
  addActiveProfileAdvancedBand: (band?: Partial<Omit<EqBandSetting, "id">>) => void;
  removeActiveProfileAdvancedBand: (bandId: string) => void;
  replaceActiveProfileAdvancedBands: (bands: Array<Partial<Omit<EqBandSetting, "id">>>) => void;
  setActiveProfileSimpleControlGain: (control: EqSimpleControlId, gain: number) => void;
  setActiveProfileMeasurement: (data: DataPoint[], fileName?: string) => void;
  clearActiveProfileMeasurement: () => void;
  setActiveProfileReference: (data: DataPoint[], fileName?: string) => void;
  clearActiveProfileReference: () => void;
  setActiveProfileFlattenReference: (flatten: boolean) => void;
  resetActiveProfileBands: () => void;
};

type PersistedEqProfile = Partial<EqProfile> & {
  bands?: Array<Partial<EqBandSetting>>;
};

const DEFAULT_Q = 1.4;
const DEFAULT_PROFILE_NAME = "Default";
const MIN_SIMPLE_GAIN = -SIMPLE_EQ_GAIN_LIMIT;
const MAX_SIMPLE_GAIN = SIMPLE_EQ_GAIN_LIMIT;
const MIN_BAND_GAIN = -ADVANCED_EQ_GAIN_LIMIT;
const MAX_BAND_GAIN = ADVANCED_EQ_GAIN_LIMIT;
const MIN_PREAMP = -24;
const MAX_PREAMP = 24;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const createId = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `eq-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
};

const normalizeFilterType = (type: unknown): EqFilterType => {
  if (type === "lowshelf" || type === "highshelf" || type === "peaking") {
    return type;
  }
  return "peaking";
};

const createBand = (band: Partial<Omit<EqBandSetting, "id">> & { id?: string } = {}): EqBandSetting => ({
  id: band.id ?? createId(),
  freq: clamp(band.freq ?? 1000, EQ_MIN_FREQUENCY, EQ_MAX_FREQUENCY),
  gain: clamp(band.gain ?? 0, MIN_BAND_GAIN, MAX_BAND_GAIN),
  q: clamp(band.q ?? DEFAULT_Q, EQ_MIN_Q, EQ_MAX_Q),
  enabled: band.enabled ?? true,
  type: normalizeFilterType(band.type),
});

const createDefaultTenBandBands = (): EqBandSetting[] => (
  TEN_BAND_FREQUENCIES.map((freq) => createBand({
    freq,
    gain: 0,
    q: DEFAULT_Q,
    enabled: true,
    type: "peaking",
  }))
);

const createDefaultAdvancedBands = (): EqBandSetting[] => [];

const createDefaultSimpleControls = (): EqSimpleControls => ({
  bass: 0,
  warmth: 0,
  intimacy: 0,
  treble: 0,
});

const normalizeSimpleControls = (controls: Partial<Record<EqSimpleControlId, number>> | undefined): EqSimpleControls => ({
  bass: clamp(controls?.bass ?? 0, MIN_SIMPLE_GAIN, MAX_SIMPLE_GAIN),
  warmth: clamp(controls?.warmth ?? 0, MIN_SIMPLE_GAIN, MAX_SIMPLE_GAIN),
  intimacy: clamp(controls?.intimacy ?? 0, MIN_SIMPLE_GAIN, MAX_SIMPLE_GAIN),
  treble: clamp(controls?.treble ?? 0, MIN_SIMPLE_GAIN, MAX_SIMPLE_GAIN),
});

const createSimpleModeBands = (simpleControls: EqSimpleControls): EqBandSetting[] => (
  SIMPLE_EQ_CONTROLS.map((control) => {
    const gain = clamp(simpleControls[control.id], MIN_SIMPLE_GAIN, MAX_SIMPLE_GAIN);
    return {
      id: `simple-${control.id}`,
      freq: control.frequency,
      gain,
      q: control.q,
      enabled: Math.abs(gain) > SIMPLE_EQ_BYPASS_EPSILON,
      type: control.type,
    };
  })
);

const cloneBands = (bands: EqBandSetting[]): EqBandSetting[] => bands.map((band) => createBand(band));

const cloneSimpleControls = (controls: EqSimpleControls): EqSimpleControls => ({ ...controls });

const cloneMeasurement = (data: DataPoint[] | null): DataPoint[] | null => (
  data ? data.map((point) => ({ ...point })) : null
);

const isLikelyTenBandLayout = (bands: Array<Partial<EqBandSetting>>): boolean => {
  if (bands.length !== TEN_BAND_FREQUENCIES.length) {
    return false;
  }

  return bands.every((band, index) => Math.round(band.freq ?? -1) === TEN_BAND_FREQUENCIES[index]);
};

export const resolveProfileBands = (profile: EqProfile): EqBandSetting[] => {
  if (profile.mode === "simple") {
    return createSimpleModeBands(profile.simpleControls);
  }
  if (profile.mode === "advanced") {
    return cloneBands(profile.advancedBands);
  }
  return cloneBands(profile.tenBandBands);
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

const createProfile = (name: string, baseProfile?: EqProfile): EqProfile => {
  const now = Date.now();

  if (baseProfile) {
    return {
      ...baseProfile,
      id: createId(),
      name,
      tenBandBands: cloneBands(baseProfile.tenBandBands),
      advancedBands: cloneBands(baseProfile.advancedBands),
      simpleControls: cloneSimpleControls(baseProfile.simpleControls),
      measurementData: cloneMeasurement(baseProfile.measurementData),
      referenceData: cloneMeasurement(baseProfile.referenceData),
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
    tenBandBands: createDefaultTenBandBands(),
    advancedBands: createDefaultAdvancedBands(),
    simpleControls: createDefaultSimpleControls(),
    measurementData: null,
    measurementFileName: undefined,
    referenceData: null,
    referenceFileName: undefined,
    flattenReference: false,
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
            tenBandBands: profile.tenBandBands.map((band) => (
              band.freq === frequency
                ? { ...band, gain: clamp(gain, MIN_BAND_GAIN, MAX_BAND_GAIN) }
                : band
            )),
            updatedAt: Date.now(),
          })),
        }));
      },

      setActiveProfileAdvancedBand: (bandId, updates) => {
        set((state) => ({
          profiles: updateActiveProfileInList(state.profiles, state.activeProfileId, (profile) => ({
            ...profile,
            advancedBands: profile.advancedBands.map((band) => {
              if (band.id !== bandId) return band;
              return {
                ...band,
                freq: updates.freq === undefined ? band.freq : clamp(updates.freq, EQ_MIN_FREQUENCY, EQ_MAX_FREQUENCY),
                gain: updates.gain === undefined ? band.gain : clamp(updates.gain, MIN_BAND_GAIN, MAX_BAND_GAIN),
                q: updates.q === undefined ? band.q : clamp(updates.q, EQ_MIN_Q, EQ_MAX_Q),
                enabled: updates.enabled === undefined ? band.enabled : updates.enabled,
                type: updates.type === undefined ? band.type : normalizeFilterType(updates.type),
              };
            }),
            updatedAt: Date.now(),
          })),
        }));
      },

      addActiveProfileAdvancedBand: (band) => {
        set((state) => ({
          profiles: updateActiveProfileInList(state.profiles, state.activeProfileId, (profile) => ({
            ...profile,
            advancedBands: [...profile.advancedBands, createBand(band)],
            updatedAt: Date.now(),
          })),
        }));
      },

      removeActiveProfileAdvancedBand: (bandId) => {
        set((state) => ({
          profiles: updateActiveProfileInList(state.profiles, state.activeProfileId, (profile) => ({
            ...profile,
            advancedBands: profile.advancedBands.filter((band) => band.id !== bandId),
            updatedAt: Date.now(),
          })),
        }));
      },

      replaceActiveProfileAdvancedBands: (bands) => {
        set((state) => ({
          profiles: updateActiveProfileInList(state.profiles, state.activeProfileId, (profile) => ({
            ...profile,
            advancedBands: bands.map((band) => createBand(band)),
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
              [control]: clamp(gain, MIN_SIMPLE_GAIN, MAX_SIMPLE_GAIN),
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

      setActiveProfileReference: (data, fileName) => {
        set((state) => ({
          profiles: updateActiveProfileInList(state.profiles, state.activeProfileId, (profile) => ({
            ...profile,
            referenceData: cloneMeasurement(data),
            referenceFileName: fileName,
            updatedAt: Date.now(),
          })),
        }));
      },

      clearActiveProfileReference: () => {
        set((state) => ({
          profiles: updateActiveProfileInList(state.profiles, state.activeProfileId, (profile) => ({
            ...profile,
            referenceData: null,
            referenceFileName: undefined,
            flattenReference: false,
            updatedAt: Date.now(),
          })),
        }));
      },

      setActiveProfileFlattenReference: (flatten) => {
        set((state) => ({
          profiles: updateActiveProfileInList(state.profiles, state.activeProfileId, (profile) => ({
            ...profile,
            flattenReference: flatten,
            updatedAt: Date.now(),
          })),
        }));
      },

      resetActiveProfileBands: () => {
        set((state) => ({
          profiles: updateActiveProfileInList(state.profiles, state.activeProfileId, (profile) => {
            const base = {
              ...profile,
              preamp: 0,
              updatedAt: Date.now(),
            };

            if (profile.mode === "ten-band") {
              return {
                ...base,
                tenBandBands: createDefaultTenBandBands(),
              };
            }

            if (profile.mode === "advanced") {
              return {
                ...base,
                advancedBands: createDefaultAdvancedBands(),
              };
            }

            return {
              ...base,
              simpleControls: createDefaultSimpleControls(),
            };
          }),
        }));
      },
    }),
    {
      name: "eq-profiles",
      version: 5,
      migrate: (persistedState: unknown) => {
        const state = persistedState as {
          profiles?: PersistedEqProfile[];
          activeProfileId?: string;
        };

        const fallbackProfiles: PersistedEqProfile[] = state?.profiles && state.profiles.length > 0
          ? state.profiles
          : [initialProfile as PersistedEqProfile];

        const profiles: EqProfile[] = fallbackProfiles.map((profile): EqProfile => {
          const mode = profile.mode ?? "ten-band";
          const legacyBands: Array<Partial<EqBandSetting>> = profile.bands ?? [];

          const tenBandSource: Array<Partial<EqBandSetting>> = profile.tenBandBands && profile.tenBandBands.length > 0
            ? profile.tenBandBands
            : (isLikelyTenBandLayout(legacyBands) ? legacyBands : createDefaultTenBandBands());

          const advancedSource: Array<Partial<EqBandSetting>> = profile.advancedBands && profile.advancedBands.length > 0
            ? profile.advancedBands
            : (mode === "advanced" ? legacyBands : createDefaultAdvancedBands());

          return {
            id: profile.id ?? createId(),
            name: profile.name ?? DEFAULT_PROFILE_NAME,
            mode,
            preampMode: profile.preampMode ?? "auto",
            preamp: clamp(profile.preamp ?? 0, MIN_PREAMP, MAX_PREAMP),
            tenBandBands: tenBandSource.map((band) => createBand(band)),
            advancedBands: advancedSource.map((band) => createBand(band)),
            simpleControls: normalizeSimpleControls(profile.simpleControls),
            measurementData: cloneMeasurement(profile.measurementData ?? null),
            measurementFileName: profile.measurementFileName,
            referenceData: cloneMeasurement(profile.referenceData ?? null),
            referenceFileName: profile.referenceFileName,
            flattenReference: profile.flattenReference ?? false,
            createdAt: profile.createdAt ?? Date.now(),
            updatedAt: profile.updatedAt ?? Date.now(),
          };
        });

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
