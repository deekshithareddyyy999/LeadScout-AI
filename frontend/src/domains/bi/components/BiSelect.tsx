import { ChevronDown } from "lucide-react";

interface BiSelectProps {
  id?: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  ariaLabel?: string;
}

/** Native select styled like the app's inputs, with a custom chevron. */
export default function BiSelect({ id, value, options, onChange, ariaLabel }: BiSelectProps) {
  return (
    <span className="bi-select">
      <select id={id} className="input" value={value} onChange={(e) => onChange(e.target.value)} aria-label={ariaLabel}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown size={15} aria-hidden="true" />
    </span>
  );
}
