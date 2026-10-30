import { useEffect, useRef } from "react";

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Confirmation for destructive actions. Escape or the backdrop cancels; focus starts on Cancel. */
export default function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel }: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <>
      <div className="bi-overlay" onClick={onCancel} aria-hidden="true" />
      <div className="bi-dialog" role="alertdialog" aria-modal="true" aria-labelledby="bi-dialog-title" aria-describedby="bi-dialog-message">
        <h2 id="bi-dialog-title" className="bi-dialog__title">
          {title}
        </h2>
        <p id="bi-dialog-message" className="bi-dialog__message">
          {message}
        </p>
        <div className="bi-dialog__actions">
          <button ref={cancelRef} type="button" className="btn btn--secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn btn--danger-outline" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </>
  );
}
