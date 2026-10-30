import type { ReactNode } from "react";
import BrandMark from "./BrandMark";

interface TopBarProps {
  badge?: ReactNode;
  onBrandClick?: () => void;
  children?: ReactNode;
}

export default function TopBar({ badge, onBrandClick, children }: TopBarProps) {
  return (
    <header className="topbar">
      <div className="topbar__left">
        {onBrandClick ? (
          <button type="button" className="topbar__brand-button" onClick={onBrandClick} aria-label="LeadScout AI home">
            <BrandMark />
          </button>
        ) : (
          <BrandMark />
        )}
        {badge}
      </div>
      <nav className="topbar__right" aria-label="Utility">
        {children}
      </nav>
    </header>
  );
}

export function PortalBadge({ label }: { label: string }) {
  return (
    <span className="pill pill--primary">
      <span className="pill__dot" aria-hidden="true" />
      {label}
    </span>
  );
}
