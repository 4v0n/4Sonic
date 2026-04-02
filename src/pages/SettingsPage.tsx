import { ReactNode, useMemo, useState } from "react";
import EqModal from "../components/eq/EqModal";
import Button from "../components/ui/Button";
import Select from "../components/ui/Select";
import TextInput from "../components/ui/TextInput";
import Slider from "../components/ui/Slider";
import { ThemeName } from "../constants/themes";
import { useThemeContext } from "../context/ThemeContext";
import { ToastPosition, useUiPreferencesStore } from "../store/uiPreferencesStore";

interface SettingsSectionProps {
  title: string;
  description: string;
  children: ReactNode;
}

const SettingsSection = ({ title, description, children }: SettingsSectionProps) => (
  <section className="overflow-hidden rounded-2xl border border-(--surface2) bg-(--surface0) shadow-sm">
    <div className="border-b border-(--surface2) px-5 py-4">
      <h2 className="text-lg font-semibold text-(--text)">{title}</h2>
      <p className="mt-1 text-sm text-(--text-grey)">{description}</p>
    </div>
    <div className="divide-y divide-(--surface2)">{children}</div>
  </section>
);

interface SettingRowProps {
  name: string;
  description: string;
  children: ReactNode;
  align?: "center" | "start";
}

const SettingRow = ({ name, description, children, align = "center" }: SettingRowProps) => (
  <div
    className={`grid gap-4 px-5 py-4 md:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] ${align === "start" ? "md:items-start" : "md:items-center"}`}
  >
    <div className="min-w-0">
      <h3 className="text-sm font-semibold text-(--text)">{name}</h3>
      <p className="mt-1 text-sm leading-5 text-(--text-grey)">{description}</p>
    </div>
    <div className="w-full md:justify-self-end">{children}</div>
  </div>
);

const SettingsPage = () => {
  const [isEqModalOpen, setIsEqModalOpen] = useState(false);
  const { theme, setTheme, themes } = useThemeContext();
  const toastPosition = useUiPreferencesStore((state) => state.toastPosition);
  const visualizerColor = useUiPreferencesStore((state) => state.visualizerColor);
  const visualizerOpacity = useUiPreferencesStore((state) => state.visualizerOpacity);
  const visualizerBlur = useUiPreferencesStore((state) => state.visualizerBlur);
  const visualizerHeight = useUiPreferencesStore((state) => state.visualizerHeight);
  const visualizerResponse = useUiPreferencesStore((state) => state.visualizerResponse);
  const visualizerFps = useUiPreferencesStore((state) => state.visualizerFps);
  const setToastPosition = useUiPreferencesStore((state) => state.setToastPosition);
  const setVisualizerColor = useUiPreferencesStore((state) => state.setVisualizerColor);
  const setVisualizerOpacity = useUiPreferencesStore((state) => state.setVisualizerOpacity);
  const setVisualizerBlur = useUiPreferencesStore((state) => state.setVisualizerBlur);
  const setVisualizerHeight = useUiPreferencesStore((state) => state.setVisualizerHeight);
  const setVisualizerResponse = useUiPreferencesStore((state) => state.setVisualizerResponse);
  const setVisualizerFps = useUiPreferencesStore((state) => state.setVisualizerFps);
  const toastPositionOptions = useMemo(
    () => ([
      { label: "Top left", value: "top-left" as ToastPosition },
      { label: "Top center", value: "top-center" as ToastPosition },
      { label: "Top right", value: "top-right" as ToastPosition },
      { label: "Bottom left", value: "bottom-left" as ToastPosition },
      { label: "Bottom center", value: "bottom-center" as ToastPosition },
      { label: "Bottom right", value: "bottom-right" as ToastPosition },
    ]),
    [],
  );
  const themeOptions = useMemo(
    () => themes.map((option) => ({ label: option.label, value: option.id })),
    [themes],
  );

  const handleColorInput = (value: string) => {
    const prefixed = value.startsWith("#") ? value : `#${value}`;
    if (/^#[0-9a-fA-F]{0,6}$/.test(prefixed)) {
      setVisualizerColor(prefixed);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 pb-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold text-(--text)">Settings</h1>
        <p className="text-sm text-(--text-grey)">
          Manage app behavior and playback visuals.
        </p>
      </div>

      <SettingsSection
        title="Appearance & Notifications"
        description="Configure visual style and where notifications appear."
      >
        <SettingRow
          name="Theme"
          description="Choose the app palette. Switching theme also updates the default visualizer colour."
        >
          <div className="w-full md:w-72">
            <Select
              size="small"
              value={theme}
              onValueChange={(value) => setTheme(value as ThemeName)}
              options={themeOptions}
              fullWidth
              aria-label="Theme"
            />
          </div>
        </SettingRow>

        <SettingRow
          name="Toast position"
          description="Controls where notifications appear on screen."
        >
          <div className="w-full md:w-72">
            <Select
              size="small"
              value={toastPosition}
              onValueChange={(value) => setToastPosition(value as ToastPosition)}
              options={toastPositionOptions}
              fullWidth
              aria-label="Toast position"
            />
          </div>
        </SettingRow>
      </SettingsSection>

      <SettingsSection
        title="Playback"
        description="Configure equalizer behavior."
      >
        <SettingRow
          name="Equalizer"
          description="Open the EQ editor for profiles, FR baselines, and graph preview."
        >
          <div className="flex w-full md:justify-end">
            <Button variant="outline" onClick={() => setIsEqModalOpen(true)}>
              Open EQ
            </Button>
          </div>
        </SettingRow>
      </SettingsSection>

      <SettingsSection
        title="Playback Visualizer"
        description="Tune the look and intensity of the bottom playback visual."
      >
        <SettingRow
          name="Visualizer colour"
          description="Applies to both the line and the fill glow."
          align="start"
        >
          <div className="flex w-full items-center gap-3 md:justify-end">
            <input
              type="color"
              value={visualizerColor}
              onChange={(event) => setVisualizerColor(event.target.value)}
              className="h-10 w-14 cursor-pointer rounded-lg border border-(--surface2) bg-(--surface1) p-1"
              aria-label="Visualizer colour"
            />
            <div className="w-36">
              <TextInput
                value={visualizerColor}
                onChange={(event) => handleColorInput(event.target.value)}
                aria-label="Visualizer colour hex value"
                fullWidth
              />
            </div>
          </div>
        </SettingRow>

        <SettingRow
          name="Visualizer opacity"
          description="Lower is subtle, higher is more prominent."
          align="start"
        >
          <div className="w-full rounded-xl border border-(--surface2) bg-(--surface1) p-4 md:w-[340px]">
            <div className="mb-2 flex items-center justify-between text-xs text-(--text-grey)">
              <span>Subtle</span>
              <span className="font-semibold text-(--text)">{Math.round(visualizerOpacity * 100)}%</span>
              <span>Bold</span>
            </div>
            <Slider
              min={0}
              max={1}
              step={0.05}
              value={[visualizerOpacity]}
              onValueChange={(value) => setVisualizerOpacity(value[0] ?? visualizerOpacity)}
              aria-label="Visualizer opacity"
            />
          </div>
        </SettingRow>

        <SettingRow
          name="Visualizer blur"
          description="Softens the waveform edges."
          align="start"
        >
          <div className="w-full rounded-xl border border-(--surface2) bg-(--surface1) p-4 md:w-[340px]">
            <div className="mb-2 flex items-center justify-between text-xs text-(--text-grey)">
              <span>Crisp</span>
              <span className="font-semibold text-(--text)">{Math.round(visualizerBlur)}px</span>
              <span>Dreamy</span>
            </div>
            <Slider
              min={0}
              max={30}
              step={1}
              value={[visualizerBlur]}
              onValueChange={(value) => setVisualizerBlur(value[0] ?? visualizerBlur)}
              aria-label="Visualizer blur"
            />
          </div>
        </SettingRow>

        <SettingRow
          name="Visualizer height"
          description="Caps the visualizer to this share of the bar when volume is at 100%."
          align="start"
        >
          <div className="w-full rounded-xl border border-(--surface2) bg-(--surface1) p-4 md:w-[340px]">
            <div className="mb-2 flex items-center justify-between text-xs text-(--text-grey)">
              <span>Low profile</span>
              <span className="font-semibold text-(--text)">{Math.round(visualizerHeight * 100)}%</span>
              <span>Full height</span>
            </div>
            <Slider
              min={0}
              max={1}
              step={0.05}
              value={[visualizerHeight]}
              onValueChange={(value) => setVisualizerHeight(value[0] ?? visualizerHeight)}
              aria-label="Visualizer height"
            />
          </div>
        </SettingRow>

        <SettingRow
          name="Visualizer response"
          description="Lower values smooth motion and make peaks rise/fall less abruptly."
          align="start"
        >
          <div className="w-full rounded-xl border border-(--surface2) bg-(--surface1) p-4 md:w-[340px]">
            <div className="mb-2 flex items-center justify-between text-xs text-(--text-grey)">
              <span>Smooth</span>
              <span className="font-semibold text-(--text)">{Math.round(visualizerResponse * 100)}%</span>
              <span>Reactive</span>
            </div>
            <Slider
              min={0.05}
              max={1}
              step={0.05}
              value={[visualizerResponse]}
              onValueChange={(value) => setVisualizerResponse(value[0] ?? visualizerResponse)}
              aria-label="Visualizer response"
            />
          </div>
        </SettingRow>

        <SettingRow
          name="Visualizer frame rate"
          description="Caps animation FPS to avoid overly fast-looking movement."
          align="start"
        >
          <div className="w-full rounded-xl border border-(--surface2) bg-(--surface1) p-4 md:w-[340px]">
            <div className="mb-2 flex items-center justify-between text-xs text-(--text-grey)">
              <span>Calm</span>
              <span className="font-semibold text-(--text)">{visualizerFps} FPS</span>
              <span>Fluid</span>
            </div>
            <Slider
              min={15}
              max={120}
              step={5}
              value={[visualizerFps]}
              onValueChange={(value) => setVisualizerFps(value[0] ?? visualizerFps)}
              aria-label="Visualizer frame rate"
            />
          </div>
        </SettingRow>
      </SettingsSection>

      <EqModal open={isEqModalOpen} onOpenChange={setIsEqModalOpen} />
    </div>
  );
};

export default SettingsPage;
