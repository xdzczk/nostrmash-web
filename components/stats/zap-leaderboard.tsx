"use client";

import { useState } from "react";

import { ProfileChip } from "@/components/explorer/entity-chips";
import { RankedList } from "@/components/stats/ranked-list";
import { countNoun } from "@/lib/stats/plural";
import type { Profile } from "@/lib/types/api";
import type { ZapLeaderboardItem } from "@/lib/types/surfaces";

const PREVIEW = 10;

function zapValue(item: ZapLeaderboardItem): string {
  const sats = `${(item.sats ?? 0).toLocaleString()} sats`;
  if (typeof item.zap_count !== "number") return sats;
  return `${sats} · ${countNoun(item.zap_count, "zap", "zaps")}`;
}

export function ZapLeaderboardList({
  items,
  profiles,
}: {
  items: ZapLeaderboardItem[];
  profiles: Record<string, Profile>;
}) {
  const [open, setOpen] = useState(false);
  const visible = open || items.length <= PREVIEW ? items : items.slice(0, PREVIEW);
  return (
    <>
      <RankedList
        items={visible.map((item) => {
          const profile = profiles[item.pubkey.toLowerCase()];
          return {
            id: item.pubkey,
            amount: item.sats ?? 0,
            entity: <ProfileChip pubkey={item.pubkey} profile={profile} />,
            value: zapValue(item),
          };
        })}
      />
      {items.length > PREVIEW ? (
        <button
          type="button"
          className="text-link mt-3 text-sm"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Show top 10" : `Show all ${items.length.toLocaleString()}`}
        </button>
      ) : null}
    </>
  );
}
