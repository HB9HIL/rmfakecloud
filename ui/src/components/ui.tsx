import { useEffect, useId, useRef, type ComponentProps, type ReactNode } from "react";
import { BsXLg } from "react-icons/bs";

import { buttonClass, inputClass, type ButtonSize, type ButtonVariant } from "./styles";

type ButtonProps = ComponentProps<"button"> & { variant?: ButtonVariant; size?: ButtonSize };

export function Button({ variant, size, className = "", type = "button", ...props }: ButtonProps) {
  return <button type={type} className={`${buttonClass(variant, size)} ${className}`} {...props} />;
}

type FieldProps = ComponentProps<"input"> & { label: string; hint?: ReactNode };

export function Field({ label, hint, id, className = "", ...props }: FieldProps) {
  const generated = useId();
  const inputId = id ?? generated;
  return (
    <div className={`mb-4 ${className}`}>
      <label htmlFor={inputId} className="mb-1 block text-sm font-medium">{label}</label>
      <input id={inputId} className={inputClass} {...props} />
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
    </div>
  );
}

export function Alert({ kind = "error", children }: { kind?: "error" | "info"; children: ReactNode }) {
  const colors = kind === "error" ? "border-danger/40 bg-danger/10 text-danger" : "border-line bg-surface";
  return (
    <div role={kind === "error" ? "alert" : "status"} className={`mb-4 rounded border px-3 py-2 text-sm whitespace-pre-wrap ${colors}`}>
      {children}
    </div>
  );
}

export function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 p-6 text-sm text-muted">
      <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      {label}
    </div>
  );
}

type DialogProps = { open: boolean; onClose: () => void; title: string; children: ReactNode };

// native modal dialog: focus trap, Esc and the backdrop come from the browser
export function Dialog({ open, onClose, title, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // start in the first field instead of the close button
      dialog.querySelector<HTMLElement>("input, select, textarea")?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="modal m-auto w-[min(32rem,calc(100%-2rem))] rounded-md border border-line bg-surface p-0 text-ink shadow-xl"
    >
      {/* mounted only while open, so forms start fresh every time */}
      {open && (
        <>
          <div className="flex items-center justify-between border-b border-line px-5 py-3">
            <h2 className="font-serif text-lg">{title}</h2>
            <Button variant="ghost" size="sm" aria-label="Close" onClick={onClose}>
              <BsXLg />
            </Button>
          </div>
          <div className="p-5">{children}</div>
        </>
      )}
    </dialog>
  );
}
