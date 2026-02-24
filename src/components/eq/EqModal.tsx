import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/Dialog";
import Button from "../ui/Button";
import Select from "../ui/Select";
import Slider from "../ui/Slider";
import TextInput from "../ui/TextInput";
import SquigGraph, { FilterType, eqFilter } from "../ui/SquigGraph";
import { parseFRFile, smoothData } from "../../utils/fr";
import cn from "../../utils/cn";
import {
  EqFilterType,
  EqMode,
  EqPreampMode,
  SIMPLE_EQ_CONTROLS,
  SIMPLE_EQ_GAIN_LIMIT,
  resolveProfileBands,
  resolveProfilePreamp,
  useEqStore,
} from "../../store/eqStore";

type EqModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const MODE_OPTIONS: { id: EqMode; label: string }[] = [
  { id: "simple", label: "Simple" },
  { id: "ten-band", label: "10 Band" },
  { id: "advanced", label: "Advanced" },
];

const PREAMP_MODE_OPTIONS: { id: EqPreampMode; label: string }[] = [
  { id: "auto", label: "Auto" },
  { id: "manual", label: "Manual" },
];

const formatFrequency = (frequency: number): string => {
  if (frequency >= 1000) return `${(frequency / 1000).toFixed(frequency >= 10000 ? 0 : 1)}k`;
  return `${frequency}`;
};

const toGraphFilterType = (type: EqFilterType): FilterType => {
  if (type === "lowshelf") return FilterType.LOW_SHELF;
  if (type === "highshelf") return FilterType.HIGH_SHELF;
  return FilterType.PEAK;
};

const clampUnit = (value: number): number => Math.max(-1, Math.min(1, value));

const getSimpleSliderAccentColor = (gain: number): string => {
  const normalized = clampUnit(gain / SIMPLE_EQ_GAIN_LIMIT);
  const intensity = Math.abs(normalized);
  if (intensity <= 0.02) {
    return "hsl(0 0% 55%)";
  }

  if (normalized > 0) {
    const hue = 112 + intensity * 28;
    const saturation = 62 + intensity * 18;
    const lightness = 46 - intensity * 8;
    return `hsl(${hue} ${saturation}% ${lightness}%)`;
  }

  const hue = 20 - intensity * 14;
  const saturation = 78 + intensity * 10;
  const lightness = 52 - intensity * 10;
  return `hsl(${hue} ${saturation}% ${lightness}%)`;
};

const simpleSliderToneClasses = [
  "[&_[data-slot=slider-track]]:bg-[linear-gradient(90deg,hsl(6_86%_52%)_0%,hsl(0_0%_44%)_50%,hsl(140_72%_45%)_100%)]",
  "[&_[data-slot=slider-range]]:bg-[var(--eq-simple-accent)]",
  "[&_[data-slot=slider-thumb]]:border-[var(--eq-simple-accent)]",
  "[&_[data-slot=slider-thumb]]:shadow-[0_0_0_1px_var(--eq-simple-accent)]",
].join(" ");

const EqModal = ({ open, onOpenChange }: EqModalProps) => {
  const profiles = useEqStore((state) => state.profiles);
  const activeProfileId = useEqStore((state) => state.activeProfileId);
  const setActiveProfile = useEqStore((state) => state.setActiveProfile);
  const createProfile = useEqStore((state) => state.createProfile);
  const updateActiveProfileName = useEqStore((state) => state.updateActiveProfileName);
  const deleteActiveProfile = useEqStore((state) => state.deleteActiveProfile);
  const setActiveProfileMode = useEqStore((state) => state.setActiveProfileMode);
  const setActiveProfilePreampMode = useEqStore((state) => state.setActiveProfilePreampMode);
  const setActiveProfilePreamp = useEqStore((state) => state.setActiveProfilePreamp);
  const setActiveProfileBandGain = useEqStore((state) => state.setActiveProfileBandGain);
  const setActiveProfileSimpleControlGain = useEqStore((state) => state.setActiveProfileSimpleControlGain);
  const setActiveProfileMeasurement = useEqStore((state) => state.setActiveProfileMeasurement);
  const clearActiveProfileMeasurement = useEqStore((state) => state.clearActiveProfileMeasurement);
  const resetActiveProfileBands = useEqStore((state) => state.resetActiveProfileBands);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeProfile = useMemo(
    () => profiles.find((profile) => profile.id === activeProfileId) ?? profiles[0],
    [activeProfileId, profiles],
  );
  const [profileNameDraft, setProfileNameDraft] = useState(activeProfile?.name ?? "");

  useEffect(() => {
    setProfileNameDraft(activeProfile?.name ?? "");
  }, [activeProfile?.id, activeProfile?.name]);

  const profileOptions = useMemo(
    () => profiles.map((profile) => ({ label: profile.name, value: profile.id })),
    [profiles],
  );

  const effectiveBands = useMemo(
    () => (activeProfile ? resolveProfileBands(activeProfile) : []),
    [activeProfile],
  );

  const graphFilters = useMemo<eqFilter[]>(
    () => (
      activeProfile ? effectiveBands.map((band, index) => ({
        id: `${activeProfile.id}-${activeProfile.mode}-${band.freq}-${index}`,
        type: toGraphFilterType(band.type),
        freq: band.freq,
        gain: band.gain,
        q: band.q,
        enabled: band.enabled,
      })) : []
    ),
    [activeProfile, effectiveBands],
  );
  const effectivePreamp = useMemo(
    () => (activeProfile ? resolveProfilePreamp(activeProfile) : 0),
    [activeProfile],
  );

  if (!activeProfile) return null;

  const handleCreateProfile = () => {
    createProfile(profileNameDraft.trim());
    toast.success("Created EQ profile");
  };

  const handleRenameProfile = () => {
    const trimmed = profileNameDraft.trim();
    if (!trimmed) {
      toast.error("Profile name cannot be empty");
      return;
    }
    updateActiveProfileName(trimmed);
    toast.success("Profile renamed");
  };

  const handleDeleteProfile = () => {
    if (profiles.length <= 1) {
      toast.error("At least one profile is required");
      return;
    }
    deleteActiveProfile();
    toast.success("Deleted EQ profile");
  };

  const handleUploadMeasurement: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = parseFRFile(text);
      if (parsed.length < 2) {
        toast.error("Unable to load FR file", { description: "Need at least 2 valid freq/SPL rows." });
        return;
      }
      const smoothed = smoothData(parsed);
      setActiveProfileMeasurement(smoothed, file.name);
      toast.success(`Loaded ${smoothed.length} FR points`);
    } catch (error) {
      const description = error instanceof Error ? error.message : undefined;
      toast.error("Failed to parse FR file", description ? { description } : undefined);
    } finally {
      event.target.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] max-w-[min(1200px,95vw)] p-0 sm:rounded-2xl">
        <div className="grid h-full min-h-[640px] grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)]">
          <div className="min-h-0 overflow-y-auto border-b border-(--surface2) p-5 lg:border-b-0 lg:border-r">
            <DialogHeader className="mb-4 pr-10 text-left">
              <DialogTitle>Equalizer</DialogTitle>
              <DialogDescription>
                Manage EQ profiles and preview the response curve.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-(--text-grey)">Profile</p>
                <Select
                  size="small"
                  value={activeProfile.id}
                  onValueChange={setActiveProfile}
                  options={profileOptions}
                  fullWidth
                />
                <TextInput
                  fieldSize="small"
                  value={profileNameDraft}
                  onChange={(event) => setProfileNameDraft(event.target.value)}
                  placeholder="Profile name"
                  fullWidth
                />
                <div className="flex flex-wrap gap-2">
                  <Button size="small" variant="outline" onClick={handleCreateProfile}>New</Button>
                  <Button size="small" variant="ghost" onClick={handleRenameProfile}>Rename</Button>
                  <Button size="small" variant="destructive" onClick={handleDeleteProfile}>Delete</Button>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-(--text-grey)">Mode</p>
                <div className="grid grid-cols-3 gap-2">
                  {MODE_OPTIONS.map((mode) => (
                    <Button
                      key={mode.id}
                      size="small"
                      variant={activeProfile.mode === mode.id ? "primary" : "outline"}
                      onClick={() => setActiveProfileMode(mode.id)}
                      className="rounded-xl"
                    >
                      {mode.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-(--text-grey)">FR Baseline</p>
                <div className="flex flex-wrap gap-2">
                  <Button size="small" variant="outline" onClick={() => fileInputRef.current?.click()}>
                    Upload FR
                  </Button>
                  <Button
                    size="small"
                    variant="ghost"
                    onClick={clearActiveProfileMeasurement}
                    disabled={!activeProfile.measurementData}
                  >
                    Clear
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.frd,.csv,text/plain"
                    className="hidden"
                    onChange={handleUploadMeasurement}
                  />
                </div>
                <p className="text-xs text-(--text-grey)">
                  {activeProfile.measurementFileName
                    ? `Loaded: ${activeProfile.measurementFileName} (${activeProfile.measurementData?.length ?? 0} points, smoothed)`
                    : "Upload a two-column file: freq spl"}
                </p>
              </div>
            </div>
          </div>

          <div className="min-h-0 overflow-y-auto p-5">
            <div className="space-y-4">
              <div className="rounded-2xl  p-3">
                <SquigGraph
                  filters={graphFilters}
                  preamp={effectivePreamp}
                  applyPreampOffset={activeProfile.preampMode !== "auto"}
                  measurementData={activeProfile.measurementData}
                />
              </div>

              <div className="rounded-2xl bg-(--surface0) p-4">
                {activeProfile.mode === "ten-band" ? (
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                        <span className="text-(--text-grey)">
                          Preamp: <span className="font-semibold text-(--text)">{effectivePreamp.toFixed(1)} dB</span>
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          {PREAMP_MODE_OPTIONS.map((option) => (
                            <Button
                              key={option.id}
                              size="small"
                              variant={activeProfile.preampMode === option.id ? "primary" : "outline"}
                              onClick={() => setActiveProfilePreampMode(option.id)}
                              className="rounded-xl"
                            >
                              {option.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-(--text-grey)">
                        Auto preamp follows the highest active boost; manual preamp uses the dedicated slider.
                      </p>
                    </div>

                    <div className="flex flex-nowrap gap-3 overflow-x-auto pb-2">
                      {activeProfile.preampMode === "manual" ? (
                        <div className="flex shrink-0 flex-col items-center rounded-xl bg-(--surface0) px-2 py-3">
                          <span className="text-xs text-(--text-grey)">Manual</span>
                          <span className="mb-2 text-xs font-semibold text-(--text)">{activeProfile.preamp.toFixed(1)} dB</span>
                          <div className="h-40">
                            <Slider
                              orientation="vertical"
                              min={-24}
                              max={24}
                              step={0.1}
                              value={[activeProfile.preamp]}
                              onValueChange={(value) => setActiveProfilePreamp(value[0] ?? activeProfile.preamp)}
                              className="h-full"
                            />
                          </div>
                          <span className="mt-2 text-xs font-semibold text-(--text)">Preamp</span>
                        </div>
                      ) : null}

                      {activeProfile.bands.map((band) => (
                        <div key={band.freq} className="flex shrink-0 flex-col items-center px-2 py-3">
                          <span className="mb-2 text-xs font-semibold text-(--text)">{band.gain.toFixed(1)}</span>
                          <div className="h-40">
                            <Slider
                              orientation="vertical"
                              min={-12}
                              max={12}
                              step={0.1}
                              value={[band.gain]}
                              onValueChange={(value) => setActiveProfileBandGain(band.freq, value[0] ?? band.gain)}
                              className="h-full"
                            />
                          </div>
                          <span className="mt-2 text-xs font-semibold text-(--text)">{formatFrequency(band.freq)} Hz</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-end">
                      <Button size="small" variant="ghost" onClick={resetActiveProfileBands}>Reset</Button>
                    </div>
                  </div>
                ) : activeProfile.mode === "simple" ? (
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                        <span className="text-(--text-grey)">
                          Preamp: <span className="font-semibold text-(--text)">{effectivePreamp.toFixed(1)} dB</span>
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          {PREAMP_MODE_OPTIONS.map((option) => (
                            <Button
                              key={option.id}
                              size="small"
                              variant={activeProfile.preampMode === option.id ? "primary" : "outline"}
                              onClick={() => setActiveProfilePreampMode(option.id)}
                              className="rounded-xl"
                            >
                              {option.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {activeProfile.preampMode === "manual" ? (
                      <div className="space-y-2 rounded-xl bg-(--surface0) p-2">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                          <span className="text-(--text-grey)">
                            Manual Preamp: <span className="font-semibold text-(--text)">{activeProfile.preamp.toFixed(1)} dB</span>
                          </span>
                        </div>
                        <Slider
                          orientation="horizontal"
                          min={-24}
                          max={24}
                          step={0.1}
                          value={[activeProfile.preamp]}
                          onValueChange={(value) => setActiveProfilePreamp(value[0] ?? activeProfile.preamp)}
                          className="w-full"
                        />
                      </div>
                    ) : null}

                    <div className="space-y-2">
                      {SIMPLE_EQ_CONTROLS.map((control) => {
                        const gain = activeProfile.simpleControls[control.id];
                        const accentColor = getSimpleSliderAccentColor(gain);
                        const sliderStyle = { "--eq-simple-accent": accentColor } as CSSProperties;

                        return (
                          <div
                            key={control.id}
                            className="flex items-center gap-3 rounded-lg bg-(--surface0) px-2 py-2"
                          >
                            <span className="w-24 text-[11px] text-(--text-grey)">{control.minLabel}</span>
                            <Slider
                              aria-label={control.label}
                              orientation="horizontal"
                              min={-12}
                              max={12}
                              step={0.1}
                              value={[gain]}
                              onValueChange={(value) => setActiveProfileSimpleControlGain(control.id, value[0] ?? gain)}
                              className={cn("w-full", simpleSliderToneClasses)}
                              style={sliderStyle}
                            />
                            <span className="w-24 text-right text-[11px] text-(--text-grey)">{control.maxLabel}</span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex justify-end">
                      <Button size="small" variant="ghost" onClick={resetActiveProfileBands}>Reset</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-dashed border-(--surface3) bg-(--surface0) p-6 text-center text-sm text-(--text-grey)">
                    Advanced mode is planned but not implemented yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EqModal;
