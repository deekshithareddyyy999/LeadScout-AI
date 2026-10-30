import { useState, type KeyboardEvent } from "react";
import { Plus, X } from "lucide-react";

interface SkillTagInputProps {
  id: string;
  value: string[];
  onChange: (skills: string[]) => void;
  invalid?: boolean;
}

export default function SkillTagInput({ id, value, onChange, invalid }: SkillTagInputProps) {
  const [draft, setDraft] = useState("");

  function commit(raw: string) {
    const additions = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((s) => !value.some((existing) => existing.toLowerCase() === s.toLowerCase()));
    if (additions.length) onChange([...value, ...additions]);
    setDraft("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commit(draft);
    } else if (event.key === "Backspace" && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div className={`tag-input${invalid ? " tag-input--invalid" : ""}`} onClick={() => document.getElementById(id)?.focus()}>
      {value.map((skill) => (
        <span key={skill} className="tag-input__tag">
          {skill}
          <button
            type="button"
            className="tag-input__remove"
            onClick={(e) => {
              e.stopPropagation();
              onChange(value.filter((s) => s !== skill));
            }}
            aria-label={`Remove ${skill}`}
          >
            <X size={12} />
          </button>
        </span>
      ))}
      <span className="tag-input__entry">
        <Plus size={13} aria-hidden="true" />
        <input
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => draft && commit(draft)}
          placeholder="Type skill & press Enter"
        />
      </span>
    </div>
  );
}
