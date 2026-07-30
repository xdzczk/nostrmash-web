import { forwardRef, type ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "chip" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANT: Record<ButtonVariant, string> = {
  primary: "rounded-xl bg-accent text-white hover:bg-accent-hover",
  secondary:
    "rounded-xl border border-edge bg-surface/70 text-ink-soft hover:border-edge-strong hover:bg-surface",
  ghost: "rounded-xl text-ink-dim hover:bg-surface hover:text-ink",
  chip: "rounded-lg border border-edge bg-transparent text-ink-dim hover:border-edge-strong hover:bg-surface hover:text-ink",
  danger: "rounded-xl bg-danger text-white hover:bg-danger/90 focus-visible:ring-danger/70",
};

const SIZE: Record<ButtonSize, string> = {
  sm: "min-h-9 px-3 py-1.5 text-xs",
  md: "min-h-11 px-4 py-2 text-sm",
  lg: "min-h-12 px-5 py-3 text-sm",
};

const BASE =
  "nm-pressable inline-flex shrink-0 items-center justify-center gap-2 font-medium tracking-[-0.01em] focus-visible:ring-2 focus-visible:ring-accent-soft/70 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50";

/** Shared class recipe for `<button>` and link-styled buttons (e.g. not-found). */
export function buttonClassName({
  variant = "primary",
  size = "md",
  className = "",
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}): string {
  return `${BASE} ${SIZE[size]} ${VARIANT[variant]} ${className}`.trim();
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

/**
 * The single button vocabulary for the app. Chip is pill-shaped (rounded-full
 * overrides the base radius). All variants share press + focus affordances.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", className = "", type = "button", ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClassName({ variant, size, className })}
      {...props}
    />
  );
});
