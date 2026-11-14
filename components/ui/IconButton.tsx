"use client";
import { forwardRef, type ReactNode } from "react";

/**
 * Square icon control with a visible tooltip on hover and focus. The tooltip text is also the
 * accessible name; `pressed` makes it a toggle.
 */
export const IconButton = forwardRef<HTMLButtonElement, {
  label: string; icon: ReactNode; onClick?: () => void; pressed?: boolean; expanded?: boolean; controls?: string;
  tip?: "left" | "right" | "top" | "bottom"; shortcut?: string; className?: string; disabled?: boolean;
}>(function IconButton({ label, icon, onClick, pressed, expanded, controls, tip = "left", shortcut, className, disabled }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      className={`ui-icon-btn ${className ?? ""}`}
      aria-label={label}
      aria-pressed={pressed}
      aria-expanded={expanded}
      aria-controls={controls}
      aria-keyshortcuts={shortcut}
      onClick={onClick}
      disabled={disabled}
      data-tip={tip}
    >
      {icon}
      <span className="ui-tip" aria-hidden="true">{label}{shortcut ? <kbd>{shortcut}</kbd> : null}</span>
    </button>
  );
});
