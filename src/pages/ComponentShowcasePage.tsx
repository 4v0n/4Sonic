import { useState } from "react";
import Checkbox from "../components/ui/Checkbox";

const Section: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => (
  <section className="space-y-4">
    <h2 className="text-2xl font-bold border-b border-(--surface2) pb-2">{title}</h2>
    {children}
  </section>
);

const ComponentShowcasePage = () => {

  const [isChecked, setIsChecked] = useState(false);

  return (
    <div className="space-y-12 p-4">
      <h1 className="text-2xl font-extrabold ">Component Showcase</h1>

      <Section title="Checkbox">
        <div className="flex items-center space-x-2">
          <Checkbox id="demo-check" checked={isChecked} onCheckedChange={setIsChecked} />
          <label htmlFor="demo-check">
            This is an example checkbox
          </label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox id="demo-check" checked={isChecked} onCheckedChange={setIsChecked} disabled />
          <label htmlFor="demo-check">
            This is an example checkbox
          </label>
        </div>
      </Section>
    </div>
  );
};

export default ComponentShowcasePage;