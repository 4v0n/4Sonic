import { useMemo } from "react";
import TextInput from "../components/ui/TextInput";
import Switch from "../components/ui/Switch";
import Select from "../components/ui/Select";
import Button from "../components/ui/Button";
import { useUiPreferencesStore } from "../store/uiPreferencesStore";
import { usePlaybackStore } from "../store/playbackStore";
import { useWindowsAudioDevices } from "../hooks/useWindowsAudioDevices";

const SettingsPage = () => {
  const visualizerColor = useUiPreferencesStore((state) => state.visualizerColor);
  const visualizerOpacity = useUiPreferencesStore((state) => state.visualizerOpacity);
  const visualizerBlur = useUiPreferencesStore((state) => state.visualizerBlur);
  const visualizerHeight = useUiPreferencesStore((state) => state.visualizerHeight);
  const setVisualizerColor = useUiPreferencesStore((state) => state.setVisualizerColor);
  const setVisualizerOpacity = useUiPreferencesStore((state) => state.setVisualizerOpacity);
  const setVisualizerBlur = useUiPreferencesStore((state) => state.setVisualizerBlur);
  const setVisualizerHeight = useUiPreferencesStore((state) => state.setVisualizerHeight);
  const outputDeviceId = usePlaybackStore((state) => state.outputDeviceId);
  const setOutputDevice = usePlaybackStore((state) => state.setOutputDevice);
  const exclusiveMode = usePlaybackStore((state) => state.exclusiveMode);
  const setExclusiveMode = usePlaybackStore((state) => state.setExclusiveMode);
  const bitPerfectMode = usePlaybackStore((state) => state.bitPerfectMode);
  const setBitPerfectMode = usePlaybackStore((state) => state.setBitPerfectMode);
  const {
    isWindows,
    devices: windowsDevices,
    loading: windowsDevicesLoading,
    error: windowsDeviceError,
    refresh,
    supportsSinkSelection,
  } = useWindowsAudioDevices();

  const handleColorInput = (value: string) => {
    const prefixed = value.startsWith("#") ? value : `#${value}`;
    if (/^#[0-9a-fA-F]{0,6}$/.test(prefixed)) {
      setVisualizerColor(prefixed);
    }
  };

  const outputOptions = useMemo(
    () => [
      { label: "System default (WASAPI)", value: "" },
      ...windowsDevices.map((device) => ({
        label: device.label,
        value: device.id,
        disabled: !supportsSinkSelection && !device.sinkId,
      })),
    ],
    [supportsSinkSelection, windowsDevices],
  );

  const handleOutputChange = async (value: string) => {
    const target = windowsDevices.find((device) => device.id === value);
    try {
      await setOutputDevice(value || null, target?.sinkId ?? null);
    } catch (error) {
      console.warn("Unable to switch output device", error);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold text-(--text)">Settings</h1>
      </div>

      <section className="rounded-2xl border border-(--surface2) bg-(--surface0) p-5 shadow-sm space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-(--text)">Playback visualizer</h2>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-(--text)">Visualizer colour</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={visualizerColor}
                onChange={(event) => setVisualizerColor(event.target.value)}
                className="h-10 w-16 cursor-pointer rounded-lg border border-(--surface2) bg-(--surface1) p-1"
                aria-label="Visualizer colour"
              />
              <TextInput
                value={visualizerColor}
                onChange={(event) => handleColorInput(event.target.value)}
                aria-label="Visualizer colour hex value"
                fullWidth={false}
                className="w-32"
              />
            </div>
            <p className="text-xs text-(--text-grey)">Applies to both the line and the fill glow.</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-(--text)">Visualizer opacity</label>
            <div className="rounded-xl border border-(--surface2) bg-(--surface1) p-4">
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={visualizerOpacity}
                onChange={(event) => setVisualizerOpacity(parseFloat(event.target.value))}
                className="w-full accent-(--primary0)"
                aria-label="Visualizer opacity"
              />
              <div className="mt-2 flex items-center justify-between text-xs text-(--text-grey)">
                <span>Subtle</span>
                <span className="font-semibold text-(--text)">{Math.round(visualizerOpacity * 100)}%</span>
                <span>Bold</span>
              </div>
            </div>
            <p className="text-xs text-(--text-grey)">Adjusts how prominent the area visual is.</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-(--text)">Visualizer blur</label>
            <div className="rounded-xl border border-(--surface2) bg-(--surface1) p-4">
              <input
                type="range"
                min={0}
                max={30}
                step={1}
                value={visualizerBlur}
                onChange={(event) => setVisualizerBlur(parseFloat(event.target.value))}
                className="w-full accent-(--primary0)"
                aria-label="Visualizer blur"
              />
              <div className="mt-2 flex items-center justify-between text-xs text-(--text-grey)">
                <span>Crisp</span>
                <span className="font-semibold text-(--text)">{Math.round(visualizerBlur)}px</span>
                <span>Dreamy</span>
              </div>
            </div>
            <p className="text-xs text-(--text-grey)">Softens the waveform edges.</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-(--text)">Visualizer height</label>
            <div className="rounded-xl border border-(--surface2) bg-(--surface1) p-4">
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={visualizerHeight}
                onChange={(event) => setVisualizerHeight(parseFloat(event.target.value))}
                className="w-full accent-(--primary0)"
                aria-label="Visualizer height"
              />
              <div className="mt-2 flex items-center justify-between text-xs text-(--text-grey)">
                <span>Low profile</span>
                <span className="font-semibold text-(--text)">{Math.round(visualizerHeight * 100)}%</span>
                <span>Full height</span>
              </div>
            </div>
            <p className="text-xs text-(--text-grey)">Caps the visualizer to this share of the bar when volume is at 100%.</p>
          </div>
        </div>
      </section>

      {isWindows ? (
        <section className="rounded-2xl border border-(--surface2) bg-(--surface0) p-5 shadow-sm space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold text-(--text)">Windows audio (WASAPI)</h2>
              <p className="text-sm text-(--text-grey)">
                Exclusive playback and bit-perfect output are only available on Windows. Selection uses the OS&apos;s WASAPI
                devices and falls back to the system default when unsupported.
              </p>
            </div>
            <Button size="small" variant="secondary" onClick={() => void refresh()} disabled={windowsDevicesLoading}>
              {windowsDevicesLoading ? "Scanning..." : "Rescan outputs"}
            </Button>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-(--surface2) bg-(--surface1) px-4 py-3">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-(--text)">Exclusive playback</p>
                <p className="text-xs text-(--text-grey)">
                  Requests WASAPI exclusive output and bypasses the shared mixer when available. Playback will fall back to
                  shared mode if the device rejects exclusivity.
                </p>
              </div>
              <Switch
                checked={exclusiveMode}
                onCheckedChange={(checked) => setExclusiveMode(Boolean(checked))}
                disabled={windowsDevicesLoading}
              />
            </div>

            <div className="flex items-center justify-between gap-3 rounded-xl border border-(--surface2) bg-(--surface1) px-4 py-3">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-(--text)">Bit-perfect mode</p>
                <p className="text-xs text-(--text-grey)">
                  Minimizes DSP by bypassing EQ/visualizer nodes for the cleanest path to the device. Volume and mute are
                  still honored by the player.
                </p>
              </div>
              <Switch
                checked={bitPerfectMode}
                onCheckedChange={(checked) => setBitPerfectMode(Boolean(checked))}
                disabled={windowsDevicesLoading}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-(--text)">Output device</label>
              <Select
                options={outputOptions}
                value={outputDeviceId ?? ""}
                onValueChange={handleOutputChange}
                disabled={!supportsSinkSelection || windowsDevicesLoading}
                fullWidth
                placeholder="Select an output"
              />
              <p className="text-xs text-(--text-grey)">
                {supportsSinkSelection
                  ? "Uses WASAPI devices and Chromium sink selection. Keep the system volume at 100% for best fidelity."
                  : "This runtime cannot switch sinks; playback stays on the default output."}
              </p>
              {windowsDeviceError ? (
                <p className="text-xs text-(--danger0)">{windowsDeviceError}</p>
              ) : null}
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-(--surface2) bg-(--surface0) p-5 shadow-sm">
          <p className="text-sm text-(--text-grey)">Windows-only WASAPI settings become available when running on Windows.</p>
        </section>
      )}
    </div>
  );
};

export default SettingsPage;
