import { describe, expect, it } from "vitest";

import {
  buildPreviewMp4,
  locatePreviewSample,
  planMoovFetch,
  type PreviewSample,
} from "@/lib/media/video-preview";

function be(value: number, width: number): number[] {
  const out = new Array<number>(width).fill(0);
  let rest = value;
  for (let index = width - 1; index >= 0; index -= 1) {
    out[index] = rest & 0xff;
    rest = Math.floor(rest / 256);
  }
  return out;
}

function box(type: string, payload: number[]): number[] {
  const size = 8 + payload.length;
  return [
    ...be(size, 4),
    type.charCodeAt(0),
    type.charCodeAt(1),
    type.charCodeAt(2),
    type.charCodeAt(3),
    ...payload,
  ];
}

describe("video preview", () => {
  it("finds a movie index that sits after the media data", () => {
    const header = Uint8Array.from([
      ...box("ftyp", [...be(0x6d703432, 4), ...be(0, 4), ...be(0x69736f6d, 4)]),
      0,
      0,
      0,
      1,
      ..."mdat".split("").map((char) => char.charCodeAt(0)),
      ...be(0, 4),
      ...be(1000, 4),
    ]);
    expect(planMoovFetch(header, header.length + 1000 - 16 + 80)).toEqual({
      kind: "range",
      start: 1020,
      end: 1099,
    });
  });

  it("reads a keyframe that is already in the header", () => {
    const sampleEntry = box("avc1", [
      ...new Array(6).fill(0),
      0,
      1,
      ...new Array(16).fill(0),
      0x01,
      0xe0,
      0x03,
      0x54,
      ...new Array(50).fill(0),
    ]);
    // width at entry offset 32: 0x01e0 = 480, height 0x0354 = 852.
    const stsd = box("stsd", [...be(0, 4), ...be(1, 4), ...sampleEntry]);
    const stts = box("stts", [...be(0, 4), ...be(1, 4), ...be(1, 4), ...be(3000, 4)]);
    const stss = box("stss", [...be(0, 4), ...be(1, 4), ...be(1, 4)]);
    const stsc = box("stsc", [...be(0, 4), ...be(1, 4), ...be(1, 4), ...be(1, 4), ...be(1, 4)]);
    const stsz = box("stsz", [...be(0, 4), ...be(0, 4), ...be(1, 4), ...be(1200, 4)]);
    const stco = box("stco", [...be(0, 4), ...be(1, 4), ...be(4096, 4)]);
    const stbl = box("stbl", [...stsd, ...stts, ...stss, ...stsc, ...stsz, ...stco]);
    const vmhd = box("vmhd", [...be(1, 4), ...new Array(8).fill(0)]);
    const minf = box("minf", [...vmhd, ...stbl]);
    const mdhd = box("mdhd", [
      ...new Array(12).fill(0),
      ...be(90000, 4),
      ...be(3000, 4),
      0x55,
      0xc4,
      0,
      0,
    ]);
    const hdlr = box("hdlr", [
      ...new Array(8).fill(0),
      ..."vide".split("").map((char) => char.charCodeAt(0)),
      ...new Array(12).fill(0),
    ]);
    const mdia = box("mdia", [...mdhd, ...hdlr, ...minf]);
    const tkhd = box("tkhd", new Array(80).fill(0));
    const trak = box("trak", [...tkhd, ...mdia]);
    const mvhd = box("mvhd", new Array(100).fill(0));
    const moov = box("moov", [...mvhd, ...trak]);
    const bytes = Uint8Array.from(moov);

    const located = locatePreviewSample(bytes);
    expect(located).toMatchObject({
      offset: 4096,
      size: 1200,
      width: 480,
      height: 852,
      timescale: 90000,
      duration: 3000,
    });
    expect(planMoovFetch(bytes, bytes.length)).toEqual({ kind: "ready" });
  });

  it("wraps that keyframe in a file a player can open", () => {
    const sample = Uint8Array.from([1, 2, 3, 4]);
    const meta: PreviewSample = {
      offset: 10,
      size: sample.length,
      width: 16,
      height: 16,
      timescale: 1000,
      duration: 40,
      sampleEntry: Uint8Array.from(box("avc1", new Array(78).fill(0))),
    };
    const preview = buildPreviewMp4(sample, meta);
    expect(String.fromCharCode(...preview.subarray(4, 8))).toBe("ftyp");
    expect(preview.length).toBeGreaterThan(sample.length);
    expect(preview.length).toBeLessThan(2000);
  });
});
