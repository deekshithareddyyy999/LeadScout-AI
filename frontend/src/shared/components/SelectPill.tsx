import { ChevronDown, type LucideIcon } from "lucide-react";

interface SelectPillProps<T extends string> {
  label?: string;
  icon?: LucideIcon;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  ariaLabel: string;
}

export default function SelectPill<T extends string>({ label, icon: Icon, value, options, onChange, ariaLabel }: SelectPillProps<T>) {
  return (
    <label className="select-pill">
      {Icon && <Icon size={14} aria-hidden="true" />}
      {label && <span>{label}</span>}
      <select value={value} onChange={(e) => onChange(e.target.value as T)} aria-label={ariaLabel}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown size={14} className="select-pill__chevron" aria-hidden="true" />
    </label>
  );
}
