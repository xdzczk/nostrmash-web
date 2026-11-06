/** "1 pubkey" / "2 pubkeys". The count is locale-formatted. */
export function countNoun(count: number, singular: string, plural = `${singular}s`): string {
  return `${count.toLocaleString()} ${count === 1 ? singular : plural}`;
}
