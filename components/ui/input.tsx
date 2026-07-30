import { forwardRef, type InputHTMLAttributes } from "react";

export type InputVariant = "default" | "hero" | "global";

const VARIANT: Record<InputVariant, string> = {
  default:
    "border-edge-strong bg-surface-sunken px-4 py-3 text-sm focus-visible:ring-2 focus-visible:ring-accent-soft",
  hero: "border-edge-strong/90 bg-surface-sunken/90 px-5 py-3.5 text-[0.95rem] focus-visible:border-edge-strong focus-visible:ring-2 focus-visible:ring-accent-soft/70 xl:py-4",
  global:
    "border-edge/90 bg-surface-sunken/80 py-2.5 pr-14 pl-4 text-sm focus-visible:border-accent-soft/70 focus-visible:bg-surface focus-visible:ring-2 focus-visible:ring-accent-soft/35",
};

const BASE =
  "w-full min-w-0 rounded-[var(--radius-control)] border text-ink placeholder:text-ink-faint outline-none transition-colors";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  variant?: InputVariant;
}

/** Text input primitive. Forwards refs so callers keep focus/imperative control. */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { variant = "default", className = "", ...props },
  ref
) {
  return (
    <input ref={ref} className={`${BASE} ${VARIANT[variant]} ${className}`.trim()} {...props} />
  );
});
