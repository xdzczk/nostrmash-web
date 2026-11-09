/** Relays that are shut down. They are omitted because they do not respond, not because coverage is unfinished. */
export const OFFLINE_RELAYS = [{ host: "relay.damus.io" }, { host: "relay.mostr.pub" }] as const;

/**
 * Coverage of the relays this page already listed. The share is of that list,
 * not of every relay list on the network.
 */
export function coverageStory(input: {
  listed: { host: string; distinctUsers: number; indexed: boolean }[];
}): string {
  const listed = input.listed.filter((row) => row.host.length > 0);
  const offlineDefault =
    "relay.damus.io and relay.mostr.pub are offline and unresponsive, so they are left out of the index.";
  if (listed.length === 0) return offlineDefault;

  const indexed = listed.filter((row) => row.indexed);
  const users = (rows: { distinctUsers: number }[]) =>
    rows.reduce(
      (sum, row) => sum + (Number.isFinite(row.distinctUsers) ? row.distinctUsers : 0),
      0
    );
  const listedUsers = users(listed);
  const share = listedUsers > 0 ? Math.round((users(indexed) / listedUsers) * 100) : null;
  const shareClause =
    share === null ? "" : `, covering ${share}% of the relay-list entries in that list`;

  const stillListed = OFFLINE_RELAYS.flatMap((relay) => {
    const row = listed.find((item) => item.host === relay.host);
    if (!row || row.distinctUsers <= 0) return [];
    return [
      `${relay.host} is still listed by ${new Intl.NumberFormat("en-US").format(row.distinctUsers)} accounts and is offline.`,
    ];
  });
  const offline = stillListed.length > 0 ? stillListed.join(" ") : offlineDefault;

  return `This index reads ${indexed.length} of the ${listed.length} most-listed relays on this page${shareClause}. ${offline}`;
}
