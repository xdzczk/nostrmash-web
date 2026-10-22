"use client";

import { forwardRef } from "react";

import { ProfileAvatar } from "@/components/explorer/profile-avatar";
import {
  formatProfileSecondary,
  profileLabel,
  profileSecondaryLabel,
  truncateProfileLabel,
} from "@/components/explorer/utils";
import type { HashtagEntry, Profile } from "@/lib/types/api";

export type SearchSuggestionAction = {
  id: string;
  label: string;
  href: string;
};

interface SuggestionDropdownProps {
  actions?: SearchSuggestionAction[];
  profiles: Profile[];
  hashtags: HashtagEntry[];
  activeIndex: number;
  onSelectAction?: (action: SearchSuggestionAction) => void;
  onSelectProfile: (profile: Profile) => void;
  onSelectHashtag: (hashtag: string) => void;
}

export const SuggestionDropdown = forwardRef<HTMLDivElement, SuggestionDropdownProps>(
  function SuggestionDropdown(
    {
      actions = [],
      profiles,
      hashtags,
      activeIndex,
      onSelectAction,
      onSelectProfile,
      onSelectHashtag,
    },
    ref
  ) {
    const profileOffset = actions.length;
    const hashtagOffset = actions.length + profiles.length;

    return (
      <div
        ref={ref}
        id="search-suggest-listbox"
        role="listbox"
        className="nm-pop-in border-edge-strong bg-surface absolute inset-x-0 top-full z-50 mt-1 max-h-[min(26rem,60vh)] overflow-y-auto rounded-lg border shadow-xl"
      >
        {actions.length > 0 && (
          <div>
            <p className="text-ink-faint px-3 pt-2.5 pb-1 text-[10px] font-semibold tracking-wider uppercase">
              Search
            </p>
            {actions.map((action, index) => {
              const active = index === activeIndex;
              return (
                <button
                  key={action.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={`flex min-h-11 w-full items-center px-3 py-2 text-left text-sm transition ${
                    active ? "bg-accent/15 text-ink" : "hover:bg-edge/60 text-ink-dim"
                  }`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onSelectAction?.(action);
                  }}
                >
                  <span className="truncate font-medium">{action.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {profiles.length > 0 && (
          <div>
            <p className="text-ink-faint px-3 pt-2.5 pb-1 text-[10px] font-semibold tracking-wider uppercase">
              Profiles
            </p>
            {profiles.map((profile, index) => {
              const label = profileLabel(profile);
              const secondaryRaw = profileSecondaryLabel(profile);
              const secondary = secondaryRaw ? formatProfileSecondary(secondaryRaw) : "";
              const active = profileOffset + index === activeIndex;

              return (
                <button
                  key={profile.pubkey}
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={`flex min-h-11 w-full items-center gap-2.5 px-3 py-2 text-left transition ${
                    active ? "bg-accent/15 text-ink" : "hover:bg-edge/60 text-ink-dim"
                  }`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onSelectProfile(profile);
                  }}
                >
                  <ProfileAvatar
                    profile={profile}
                    size={28}
                    className="border-edge-strong h-7 w-7 shrink-0 rounded-full border object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium" title={label}>
                      {truncateProfileLabel(label)}
                    </p>
                    {secondary ? (
                      <p
                        className="text-ink-faint truncate text-xs"
                        title={secondaryRaw ?? undefined}
                      >
                        {secondary}
                      </p>
                    ) : null}
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
              const active = hashtagOffset + index === activeIndex;
              const count = entry.event_count ?? entry.count;

              return (
                <button
                  key={tag}
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={`flex min-h-11 w-full items-center justify-between px-3 py-2 text-left text-sm transition ${
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
                      {count.toLocaleString()} {count === 1 ? "note" : "notes"}
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
