"use client";

import Image from "next/image";
import { forwardRef } from "react";

import {
  profileFallbackAvatarDataUrl,
  profileLabel,
  profilePictureUrl,
  profileSecondaryLabel,
} from "@/components/explorer/utils";
import type { HashtagEntry, Profile } from "@/lib/types/api";

interface SuggestionDropdownProps {
  profiles: Profile[];
  hashtags: HashtagEntry[];
  activeIndex: number;
  onSelectProfile: (profile: Profile) => void;
  onSelectHashtag: (hashtag: string) => void;
}

export const SuggestionDropdown = forwardRef<HTMLDivElement, SuggestionDropdownProps>(
  function SuggestionDropdown(
    { profiles, hashtags, activeIndex, onSelectProfile, onSelectHashtag },
    ref
  ) {
    const totalProfiles = profiles.length;

    return (
      <div
        ref={ref}
        id="search-suggest-listbox"
        role="listbox"
        className="absolute inset-x-0 top-full z-50 mt-1 max-h-[min(26rem,60vh)] overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl"
      >
        {profiles.length > 0 && (
          <div>
            <p className="px-3 pt-2.5 pb-1 text-[10px] font-semibold tracking-wider text-zinc-500 uppercase">
              Profiles
            </p>
            {profiles.map((profile, index) => {
              const label = profileLabel(profile);
              const secondary = profileSecondaryLabel(profile);
              const pictureUrl = profilePictureUrl(profile);
              const avatarSrc = pictureUrl ?? profileFallbackAvatarDataUrl(profile);
              const active = index === activeIndex;

              return (
                <button
                  key={profile.pubkey}
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={`flex w-full items-center gap-2.5 px-3 py-2 text-left transition ${
                    active ? "bg-indigo-500/15 text-zinc-100" : "text-zinc-300 hover:bg-zinc-800/60"
                  }`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onSelectProfile(profile);
                  }}
                >
                  <Image
                    src={avatarSrc}
                    alt={label}
                    width={28}
                    height={28}
                    unoptimized
                    className="h-7 w-7 shrink-0 rounded-full border border-zinc-700 object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{label}</p>
                    {secondary && <p className="truncate text-xs text-zinc-500">{secondary}</p>}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {hashtags.length > 0 && (
          <div>
            <p className="px-3 pt-2.5 pb-1 text-[10px] font-semibold tracking-wider text-zinc-500 uppercase">
              Hashtags
            </p>
            {hashtags.map((entry, index) => {
              const tag = (entry.hashtag ?? "").replace(/^#/, "");
              if (!tag) return null;
              const active = totalProfiles + index === activeIndex;
              const count = entry.event_count ?? entry.count;

              return (
                <button
                  key={tag}
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition ${
                    active ? "bg-indigo-500/15 text-zinc-100" : "text-zinc-300 hover:bg-zinc-800/60"
                  }`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onSelectHashtag(tag);
                  }}
                >
                  <span className="truncate font-medium">#{tag}</span>
                  {typeof count === "number" && (
                    <span className="ml-2 shrink-0 text-xs text-zinc-500">
                      {count.toLocaleString()}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }
);
