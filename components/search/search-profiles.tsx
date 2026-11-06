"use client";

import { useState } from "react";

import { ProfilesList } from "@/components/data/renderers";
import { presentSearchProfiles } from "@/lib/search/display";
import type { Profile } from "@/lib/types/api";

export function SearchProfiles({ profiles }: { profiles: Profile[] }) {
  const { visible, hidden } = presentSearchProfiles(profiles);
  const [open, setOpen] = useState(false);
  const shown = open ? [...visible, ...hidden] : visible;
  return (
    <>
      <ProfilesList profiles={shown} searchContext />
      {hidden.length > 0 ? (
        <button
          type="button"
          className="text-link mt-3 text-sm"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Show fewer" : `Show ${hidden.length.toLocaleString()} more`}
        </button>
      ) : null}
    </>
  );
}
