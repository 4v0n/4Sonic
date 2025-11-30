import TextInput from "../components/ui/TextInput";
import { useUiPreferencesStore } from "../store/uiPreferencesStore";

const SettingsPage = () => {
  const visualizerColor = useUiPreferencesStore((state) => state.visualizerColor);
  const visualizerOpacity = useUiPreferencesStore((state) => state.visualizerOpacity);
  const visualizerBlur = useUiPreferencesStore((state) => state.visualizerBlur);
  const visualizerHeight = useUiPreferencesStore((state) => state.visualizerHeight);
  const setVisualizerColor = useUiPreferencesStore((state) => state.setVisualizerColor);
  const setVisualizerOpacity = useUiPreferencesStore((state) => state.setVisualizerOpacity);
  const setVisualizerBlur = useUiPreferencesStore((state) => state.setVisualizerBlur);
  const setVisualizerHeight = useUiPreferencesStore((state) => state.setVisualizerHeight);

  const handleColorInput = (value: string) => {
    const prefixed = value.startsWith("#") ? value : `#${value}`;
    if (/^#[0-9a-fA-F]{0,6}$/.test(prefixed)) {
      setVisualizerColor(prefixed);
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
    </div>
  );
};

export default SettingsPage;
