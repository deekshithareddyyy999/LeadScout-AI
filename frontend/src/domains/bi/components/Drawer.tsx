import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

interface DrawerProps {
  label: ReactNode;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
}

/** Right-hand details panel. Escape or the backdrop closes it; focus starts on the close button. */
export default function Drawer({ label, title, onClose, children, footer }: DrawerProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <div className="bi-overlay" onClick={onClose} aria-hidden="true" />
      <aside className="bi-drawer" role="dialog" aria-modal="true" aria-labelledby="bi-drawer-title">
        <div className="bi-drawer__head">
          <span className="bi-drawer__label">{label}</span>
          <button ref={closeRef} type="button" className="icon-btn" aria-label="Close details" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="bi-drawer__body">
          <h2 id="bi-drawer-title" className="bi-drawer__title">
            {title}
          </h2>
          {children}
        </div>
        <div className="bi-drawer__foot">{footer}</div>
      </aside>
    </>
  );
}
