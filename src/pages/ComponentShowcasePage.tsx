import { useState } from "react";
import Checkbox from "../components/ui/Checkbox";
import { RadioGroup, RadioGroupItem } from "../components/ui/RadioGroup";
import Toggle from "../components/ui/Toggle";
import { AlbumIcon } from "../constants/icons";
import { ToggleGroup, ToggleGroupItem } from "../components/ui/ToggleGroup";
import { KeybindInput } from "../components/ui/KeybindInput";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/Dialog";
import Button from "../components/ui/Button";
import { toast } from "../components/ui/Sonner";
import Spinner from "../components/ui/Spinner";

const Section: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => (
  <section className="space-y-4 space-x-2">
    <h2 className="text-2xl font-bold border-b border-(--surface2) pb-2">{title}</h2>
    {children}
  </section>
);

const ComponentShowcasePage = () => {

  const [isChecked, setIsChecked] = useState(false);
  const [radioValue, setRadioValue] = useState("option-one");
  const [keybind, setKeybind] = useState("⌘ + K");

  return (
    <div className="space-y-12 p-4">
      <h1 className="text-2xl font-extrabold ">Component Showcase</h1>

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
    </div>
  );
};

export default ComponentShowcasePage;