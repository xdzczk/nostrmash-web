"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

export type ToastTone = "default" | "success" | "danger";

type ToastItem = {
  id: string;
  message: string;
  tone: ToastTone;
};

type ToastApi = {
  show: (message: string, tone?: ToastTone) => void;
  success: (message: string) => void;
  danger: (message: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

const MAX_TOASTS = 3;
const AUTO_DISMISS_MS = 3500;

const toneClassName: Record<ToastTone, string> = {
  default: "border-edge-strong bg-surface text-ink",
  success: "border-success/35 bg-success-soft text-success-ink",
  danger: "border-danger/35 bg-danger-soft text-danger-ink",
};

function createId(): string {
  return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function subscribeNoop() {
  return () => {};
}

function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const isClient = useIsClient();

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback((message: string, tone: ToastTone = "default") => {
    const trimmed = message.trim();
    if (!trimmed) return;

    const id = createId();
    setToasts((current) => {
      const next = [...current, { id, message: trimmed, tone }];
      return next.length > MAX_TOASTS ? next.slice(next.length - MAX_TOASTS) : next;
    });

    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, AUTO_DISMISS_MS);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (message: string) => show(message, "success"),
      danger: (message: string) => show(message, "danger"),
    }),
    [show]
  );

  const viewport =
    isClient &&
    createPortal(
      <div
        className="pointer-events-none fixed inset-x-0 bottom-20 z-[70] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:items-end"
        aria-live="polite"
        aria-relevant="additions"
      >
        {toasts.map((toast) => (
          <button
            key={toast.id}
            type="button"
            role="status"
            onClick={() => dismiss(toast.id)}
            className={`nm-pop-in nm-pressable pointer-events-auto max-w-sm rounded-xl border px-4 py-3 text-left text-sm font-medium shadow-lg ${toneClassName[toast.tone]}`}
          >
            {toast.message}
          </button>
        ))}
      </div>,
      document.body
    );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {viewport}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
