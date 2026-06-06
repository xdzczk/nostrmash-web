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
        className="nm-pop-in border-edge-strong bg-surface absolute inset-x-0 top-full z-50 mt-1 max-h-[min(26rem,60vh)] overflow-y-auto rounded-lg border shadow-xl"
      >
        {profiles.length > 0 && (
          <div>
            <p className="text-ink-faint px-3 pt-2.5 pb-1 text-[10px] font-semibold tracking-wider uppercase">
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
                    active ? "bg-accent/15 text-ink" : "hover:bg-edge/60 text-ink-dim"
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
                    className="border-edge-strong h-7 w-7 shrink-0 rounded-full border object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{label}</p>
                    {secondary && <p className="text-ink-faint truncate text-xs">{secondary}</p>}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {hashtags.length > 0 && (
          <div>
            <p className="text-ink-faint px-3 pt-2.5 pb-1 text-[10px] font-semibold tracking-wider uppercase">
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
                    active ? "bg-accent/15 text-ink" : "hover:bg-edge/60 text-ink-dim"
                  }`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onSelectHashtag(tag);
                  }}
                >
                  <span className="truncate font-medium">#{tag}</span>
                  {typeof count === "number" && (
                    <span className="text-ink-faint ml-2 shrink-0 text-xs">
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
