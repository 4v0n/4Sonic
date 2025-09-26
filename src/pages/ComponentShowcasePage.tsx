import { useState } from "react";
import Button from "../components/ui/Button";
import IconDropdown, { MenuOption } from "../components/ui/IconDropdown";
import Select from "../components/ui/Select";
import { PersonIcon, PlayArrowIcon, SettingsIcon, SkipNextIcon, SkipPreviousIcon } from "../constants/icons";

const Section: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => (
  <section className="space-y-4">
    <h2 className="text-2xl font-bold border-b border-(--surface2) pb-2">{title}</h2>
    {children}
  </section>
);

const ComponentShowcasePage = () => {

  const dropdownOptions: MenuOption[] = [
    { label: "Account", onClick: () => console.log("a"), icon: <PersonIcon fontSize="small" /> },
    { label: "Settings", onClick: () => console.log("b"), icon: <SettingsIcon fontSize="small" /> },
  ];

  const fruitOptions = [
    { label: "Apple", value: "apple" },
    { label: "Banana", value: "banana" },
    { label: "Mango (disabled)", value: "mango", disabled: true },
  ];
  const [fruit, setFruit] = useState("");

  return (
    <div className="space-y-12 p-4">
      <h1 className="text-2xl font-extrabold ">Component Showcase</h1>

      <Section title="Buttons & Interactive Elements">
        <div className="flex flex-wrap items-center gap-4">
          <Button className="bg-(--primary0) hover:bg-(--primary1)">
            Button
          </Button>
          <Button className="bg-(--warning0) hover:bg-(--warning1)">
            <SettingsIcon /> Icon Button
          </Button>
          <Button className="bg-(--warning0) hover:bg-(--warning1) pl-3">
            Icon Button <SettingsIcon />
          </Button>
          <Button>
            <SkipPreviousIcon fontSize="small" />
          </Button>
          <Button
            size="large"
            className="bg-(--text) hover:bg-(--primary2)"
          >
            <PlayArrowIcon fontSize="small" className="text-(--text-inverted)" />
          </Button>
          <Button disabled size="large">
            <SkipNextIcon fontSize="small" />
          </Button>
          <IconDropdown
            buttonAriaLabel="Demo dropdown"
            triggerContent={<SettingsIcon />}
            options={dropdownOptions}
          />
          <Select
            options={fruitOptions}
            value={fruit}
            onChange={(e) => setFruit(e.target.value)}
            placeholder="Pick a fruit"
            objectSize="medium"
          />
        </div>
      </Section>
    </div>
  );
};

export default ComponentShowcasePage;