/**
 * Registry admission, in reader language. Active membership is the quiet
 * default, so callers only render a note when the relay is outside it.
 */
export function indexMembershipNote(state: string | undefined, inRegistry: boolean): string | null {
  if (!inRegistry || state === "inactive") return "Not in our index";
  if (state === "blocked") return "Blocked from our index";
  if (state === "probation" || state === "draining") return "On probation in our index";
  if (state === "candidate") return "Queued for our index";
  return null;
}
