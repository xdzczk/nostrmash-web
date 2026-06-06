import { forwardRef, type InputHTMLAttributes } from "react";

export type InputVariant = "default" | "hero";

const VARIANT: Record<InputVariant, string> = {
  default:
    "border-edge-strong bg-surface-sunken px-4 py-3 text-sm focus:ring-2 focus:ring-accent-soft",
  hero: "border-edge-strong/90 bg-surface-sunken/90 px-5 py-3.5 text-[0.95rem] focus:border-edge-strong focus:ring-2 focus:ring-accent-soft/70 xl:py-4",
};

const BASE =
  "w-full min-w-0 rounded-lg border text-ink placeholder:text-ink-faint outline-none transition-colors";

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
