import { Fragment } from "react";
import { ArrowLeft, ChevronRight } from "lucide-react";

export interface Crumb {
  label: string;
  onClick?: () => void;
}

export default function Breadcrumbs({ items, onBack }: { items: Crumb[]; onBack?: () => void }) {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      {onBack && (
        <button type="button" className="breadcrumbs__back" onClick={onBack} aria-label="Back">
          <ArrowLeft size={14} />
        </button>
      )}
      {items.map((item, i) => (
        <Fragment key={item.label}>
          {i > 0 && <ChevronRight size={13} className="breadcrumbs__sep" aria-hidden="true" />}
          {item.onClick ? (
            <button type="button" className="breadcrumbs__link" onClick={item.onClick}>
              {item.label}
            </button>
          ) : (
            <span className="breadcrumbs__current" aria-current="page">
              {item.label}
            </span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
