interface ToggleProps {
  toggled: boolean;
  onToggle: () => void;
  id?: string;
};

const Toggle = ({
  toggled,
  onToggle,
  id,
}: ToggleProps) => {
  return (
    <button
      id={id}
      onClick={onToggle}
      type="button"
      className={`cursor-pointer relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-200 ease-in-out
    ${toggled ? "bg-(--success)" : "bg-(--fail)"}`}
      role="switch"
      aria-checked={toggled}
    >
      <span className="sr-only">Toggle</span>
      <span
        className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-200 ease-in-out
        ${toggled ? "translate-x-6" : "translate-x-1"}`}
      />
    </button>
  );
};

export default Toggle;