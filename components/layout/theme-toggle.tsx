"use client";

function resolvedTheme(): "light" | "dark" {
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "light" || attr === "dark") return attr;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

/**
 * Flips the explicit `data-theme` on <html> and persists the choice. The icon
 * itself is chosen by CSS (`.theme-dark-only` / `.theme-light-only`), so this
 * stays purely declarative and never mismatches on hydration.
 */
export function ThemeToggle() {
  function toggle() {
    const next = resolvedTheme() === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      // Private mode / storage disabled — the choice just won't persist.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle color theme"
      title="Toggle color theme"
      className="nm-pressable border-edge/75 bg-surface/35 text-ink-dim hover:border-edge-strong/80 hover:bg-surface/55 hover:text-ink focus-visible:ring-accent-soft/70 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border focus-visible:ring-2 focus-visible:outline-none"
    >
      {/* Sun — shown in dark theme (click switches to light). */}
      <svg
        className="theme-dark-only h-[18px] w-[18px]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32 1.41-1.41" />
      </svg>
      {/* Moon — shown in light theme (click switches to dark). */}
      <svg
        className="theme-light-only h-[18px] w-[18px]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    </button>
  );
}
