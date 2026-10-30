import { useState, type KeyboardEvent } from "react";
import { Plus, X } from "lucide-react";

interface TagInputProps {
  id: string;
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder: string;
  invalid?: boolean;
  /** Treat commas as separators (default). Turn off for values that contain commas, like "Gachibowli, Hyderabad". */
  splitOnComma?: boolean;
}

/** Enter (and, by default, comma) separated tags. Duplicates (case-insensitive) are ignored. */
export default function TagInput({ id, value, onChange, placeholder, invalid, splitOnComma = true }: TagInputProps) {
  const [draft, setDraft] = useState("");

  function commit(raw: string) {
    const seen = new Set(value.map((v) => v.toLowerCase()));
    const additions: string[] = [];
    for (const part of splitOnComma ? raw.split(",") : [raw]) {
      const tag = part.trim();
      if (tag && !seen.has(tag.toLowerCase())) {
        seen.add(tag.toLowerCase());
        additions.push(tag);
      }
    }
    if (additions.length) onChange([...value, ...additions]);
    setDraft("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || (splitOnComma && e.key === ",")) {
      e.preventDefault();
      commit(draft);
    } else if (e.key === "Backspace" && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div className={`bi-tags${invalid ? " bi-tags--invalid" : ""}`} onClick={() => document.getElementById(id)?.focus()}>
      {value.map((tag) => (
        <span key={tag} className="bi-tags__tag">
          {tag}
          <button
            type="button"
            className="bi-tags__remove"
            aria-label={`Remove ${tag}`}
            onClick={(e) => {
              e.stopPropagation();
              onChange(value.filter((t) => t !== tag));
            }}
          >
            <X size={12} />
          </button>
        </span>
      ))}
      <span className="bi-tags__entry">
        <Plus size={13} aria-hidden="true" />
        <input
          id={id}
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => draft.trim() && commit(draft)}
        />
      </span>
    </div>
  );
}
