import { useMemo, useState } from "react";
import Checkbox from "../components/ui/Checkbox";
import { RadioGroup, RadioGroupItem } from "../components/ui/RadioGroup";
import Toggle from "../components/ui/Toggle";
import { AlbumIcon, SettingsIcon } from "../constants/icons";
import { ToggleGroup, ToggleGroupItem } from "../components/ui/ToggleGroup";
import { KeybindInput } from "../components/ui/KeybindInput";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/Dialog";
import Button from "../components/ui/Button";
import Spinner from "../components/ui/Spinner";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger, ContextMenuTrigger } from "../components/ui/ContextMenu";
import ThemeToggle from "../components/ui/ThemeToggle";
import { useThemeContext } from "../context/ThemeContext";

const Section: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => (
  <section className="space-y-4 space-x-2">
    <h2 className="text-2xl font-bold border-b border-(--surface2) pb-2">{title}</h2>
    {children}
  </section>
);

const ColorSwatch = ({ token, label }: { token: string; label?: string }) => (
  <div className="flex flex-col gap-2 rounded-xl border border-(--surface2) bg-(--surface0) p-3">
    <div
      className="h-12 rounded-lg border border-(--surface2)"
      style={{ backgroundColor: `var(--${token})` }}
    />
    <div className="flex items-center justify-between text-xs text-(--text-grey)">
      <span className="font-mono text-[11px] text-(--text)">{`--${token}`}</span>
      {label ? <span>{label}</span> : null}
    </div>
  </div>
);

const ComponentShowcasePage = () => {

  const { theme } = useThemeContext();
  const [isChecked, setIsChecked] = useState(false);
  const [radioValue, setRadioValue] = useState("option-one");
  const [keybind, setKeybind] = useState("⌘ + K");
  const paletteSections = useMemo(() => ([
    {
      title: "Primary ramp",
      description: "Brand greens used for emphasis and key actions.",
      tokens: ["primary0", "primary1", "primary2", "primary3", "primary4", "primary5"],
    },
    {
      title: "Surface ramp",
      description: "Layered backgrounds for panels, cards, and separators.",
      tokens: ["surface0", "surface1", "surface2", "surface3", "surface4", "surface5"],
    },
    {
      title: "Tonal ramp",
      description: "Subtle, desaturated surfaces for neutral emphasis blocks.",
      tokens: ["surface-tonal0", "surface-tonal1", "surface-tonal2", "surface-tonal3", "surface-tonal4", "surface-tonal5"],
    },
    {
      title: "Semantic ramp",
      description: "Feedback colors for success, warning, danger, and info.",
      tokens: ["success0", "success1", "success2", "warning0", "warning1", "warning2", "danger0", "danger1", "danger2", "info0", "info1", "info2"],
    },
  ]), []);

  return (
    <div className="space-y-12 p-4">
      <h1 className="text-2xl font-extrabold ">Component Showcase</h1>

      <Section title="Theme & Palette">
        <div className="flex flex-wrap items-center gap-3">
          <ThemeToggle />
          <span className="text-sm text-(--text-grey)">Currently using the {theme} theme.</span>
        </div>

        <div className="space-y-8">
          {paletteSections.map((section) => (
            <div key={section.title} className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-semibold text-(--text)">{section.title}</h3>
                <p className="text-sm text-(--text-grey)">{section.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
                {section.tokens.map((token) => (
                  <ColorSwatch key={token} token={token} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Checkbox">
        <div className="flex items-center space-x-2">
          <Checkbox checked={isChecked} onCheckedChange={setIsChecked} />
          <label>
            This is an example checkbox
          </label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox checked={isChecked} onCheckedChange={setIsChecked} disabled />
          <label>
            This is an example checkbox
          </label>
        </div>
      </Section>

      <Section title="Radio Groups">
        <RadioGroup value={radioValue} onValueChange={setRadioValue}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="option-one" />
            <label>Option One</label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="option-two" />
            <label>Option Two</label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="option-three" disabled />
            <label>Option Three</label>
          </div>
        </RadioGroup>
      </Section>

      <Section title="Toggle">
        <Toggle
          pressed={isChecked}
          onPressedChange={setIsChecked}
          aria-label="Toggle"
        >
          <AlbumIcon />
        </Toggle>

        <Toggle
          pressed={isChecked}
          onPressedChange={setIsChecked}
          aria-label="Toggle"
          variant="outline"
        >
          <AlbumIcon />
        </Toggle>
      </Section>

      <Section title="Toggle Group">
        <ToggleGroup value={radioValue} onValueChange={setRadioValue} type="single">
          <ToggleGroupItem value="option-one"><AlbumIcon/></ToggleGroupItem>
          <ToggleGroupItem value="option-two"><AlbumIcon /></ToggleGroupItem>
        </ToggleGroup>
      </Section>

      <Section title="KeybindInput">
        <KeybindInput value={keybind} onValueChange={setKeybind} />
      </Section>

      <Section title="Buttons">
        <Button>Default</Button>
        <Button icon={<AlbumIcon/>} variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="link">Link</Button>
      </Section>

      <Section title="Dialog">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">Open Dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Are you sure?</DialogTitle>
              <DialogDescription>
                        This action cannot be undone. This will permanently delete the item.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild><Button variant="secondary">Cancel</Button></DialogClose>
              <DialogClose asChild><Button variant="destructive">Delete</Button></DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Section>

      <Section title="Spinners">
        <Spinner size="sm" />
        <Spinner size="md" />
        <Spinner size="lg" />
        <Spinner size="xl" />
        <Spinner showLabel label="Loading data..."/>
      </Section>

      <Section title="Context Menu">
        <ContextMenu>
          <ContextMenuTrigger>
            <div className="flex h-48 w-full items-center justify-center rounded-md border border-dashed border-surface-3 text-sm text-text-grey">
                        Right Click Here
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onSelect={() => alert("Profile selected")}>Profile</ContextMenuItem>
            <ContextMenuItem onSelect={() => alert("Billing selected")}>Billing</ContextMenuItem>
            <ContextMenuItem onSelect={() => alert("Team selected")}>Team</ContextMenuItem>
            <ContextMenuSub>
              <ContextMenuSubTrigger>Share</ContextMenuSubTrigger>
              <ContextMenuSubContent>
                <ContextMenuItem onSelect={() => alert("Email shared")}>Email</ContextMenuItem>
                <ContextMenuItem onSelect={() => alert("Messages shared")}>Messages</ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem onSelect={() => alert("More options...")}>More...</ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
            <ContextMenuSeparator />
            <ContextMenuItem onSelect={() => alert("Logout")}>
              <SettingsIcon />
              <span>Logout</span>
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      </Section>
    </div>
  );
};

export default ComponentShowcasePage;
