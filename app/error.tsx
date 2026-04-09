"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="space-y-3 rounded-md border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-200">
      <p className="font-medium">This page ran into a loading issue</p>
      <p className="text-red-300">{error.message || "Unexpected rendering error."}</p>
      <button
        type="button"
        className="rounded-md bg-red-500 px-3 py-1 text-xs font-medium text-white hover:bg-red-400"
        onClick={reset}
      >
        Retry page
      </button>
    </div>
  );
}
