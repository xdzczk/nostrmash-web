import { ProfilesList } from "@/components/data/renderers";
import { presentSearchProfiles } from "@/lib/search/display";
import type { Profile } from "@/lib/types/api";

/**
 * Server-rendered on purpose. A client boundary here imports the note
 * renderers, and that module evaluates the production API config in the
 * browser, which replaces the search page with the error boundary.
 */
export function SearchProfiles({ profiles }: { profiles: Profile[] }) {
  const { visible, hidden } = presentSearchProfiles(profiles);
  return (
    <>
      <ProfilesList profiles={visible} searchContext />
      {hidden.length > 0 ? (
        <details className="group mt-3">
          <summary className="text-link focus-visible:ring-accent-soft/70 cursor-pointer list-none text-sm outline-none marker:content-none focus-visible:ring-2 [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">Show {hidden.length.toLocaleString()} more</span>
            <span className="hidden group-open:inline">Show fewer</span>
          </summary>
          <div className="mt-3">
            <ProfilesList profiles={hidden} searchContext />
          </div>
        </details>
      ) : null}
    </>
  );
}
