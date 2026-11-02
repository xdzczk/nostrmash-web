import { describe, expect, it } from "vitest";

import {
  BLOSSOM_MIRRORS,
  blossomCandidateUrls,
  parseBlossomBlob,
  selectBlossomImageSrc,
  type BlossomImageSnapshot,
} from "@/lib/media/blossom";

const HASH = "ab".repeat(32);
const ORIGINAL = `https://media.21media.to/${HASH}.jpg`;

const empty: BlossomImageSnapshot = {
  failed: new Set<string>(),
  resolved: new Map<string, string>(),
};

describe("parseBlossomBlob", () => {
  it("reads a sha256 path segment and its extension", () => {
    expect(parseBlossomBlob(ORIGINAL)).toEqual({ hash: HASH, ext: ".jpg" });
    expect(parseBlossomBlob(`https://cdn.example/i/${HASH}`)).toEqual({ hash: HASH, ext: "" });
    expect(parseBlossomBlob(`https://cdn.example/${HASH.toUpperCase()}.JPG`)).toEqual({
      hash: HASH,
      ext: ".jpg",
    });
  });

  it("ignores urls that are not content-addressed blobs", () => {
    expect(parseBlossomBlob("https://cdn.example/ada.jpg")).toBeNull();
    expect(parseBlossomBlob(`https://cdn.example/${HASH}.jpg/download`)).toBeNull();
    expect(parseBlossomBlob("not a url")).toBeNull();
    expect(parseBlossomBlob(`data:image/png,${HASH}`)).toBeNull();
  });
});

describe("blossomCandidateUrls", () => {
  it("tries the author's url before the public mirrors", () => {
    expect(blossomCandidateUrls(ORIGINAL)).toEqual([
      ORIGINAL,
      ...BLOSSOM_MIRRORS.map((base) => `${base}/${HASH}.jpg`),
    ]);
  });

  it("does not repeat a mirror that is already the author's host", () => {
    const primal = `${BLOSSOM_MIRRORS[0]}/${HASH}.jpg`;
    expect(blossomCandidateUrls(primal)).toEqual([
      primal,
      ...BLOSSOM_MIRRORS.slice(1).map((base) => `${base}/${HASH}.jpg`),
    ]);
  });

  it("leaves ordinary image urls unchanged", () => {
    expect(blossomCandidateUrls("https://cdn.example/ada.jpg")).toEqual([
      "https://cdn.example/ada.jpg",
    ]);
  });
});

describe("selectBlossomImageSrc", () => {
  it("skips urls that have already failed", () => {
    const failed = new Set([ORIGINAL]);
    expect(selectBlossomImageSrc(ORIGINAL, { failed, resolved: empty.resolved }).src).toBe(
      `${BLOSSOM_MIRRORS[0]}/${HASH}.jpg`
    );
  });

  it("reuses a mirror that already loaded this hash", () => {
    const hit = `${BLOSSOM_MIRRORS[0]}/${HASH}.jpg`;
    expect(
      selectBlossomImageSrc(ORIGINAL, {
        failed: new Set([ORIGINAL]),
        resolved: new Map([[HASH, hit]]),
      }).src
    ).toBe(hit);
  });

  it("reports exhaustion once every candidate has failed", () => {
    const candidates = blossomCandidateUrls(ORIGINAL);
    const selected = selectBlossomImageSrc(ORIGINAL, {
      failed: new Set(candidates),
      resolved: empty.resolved,
    });
    expect(selected.failed).toBe(true);
    expect(selected.src).toBe(candidates.at(-1));
  });

  it("does not invent mirrors for a non-blob that failed", () => {
    const url = "https://cdn.example/ada.jpg";
    expect(
      selectBlossomImageSrc(url, { failed: new Set([url]), resolved: empty.resolved })
    ).toEqual({ src: url, failed: true });
  });
});
