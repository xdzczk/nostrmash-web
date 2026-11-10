/**
 * One video frame, without downloading the file.
 *
 * Pointing a `<video>` at the original URL makes Chromium ask for an open-ended
 * byte range and pull the rest of the file, including an index stored at the
 * end. This reads that index with a closed range, copies the first keyframe,
 * and wraps it in a tiny fast-start MP4 the page can show as a still.
 */

export const VIDEO_PREVIEW_HEAD_BYTES = 256 * 1024;
// The index grows with running time. An hour-long recording carries about
// 4 MB of it, so this covers roughly two hours.
export const VIDEO_PREVIEW_MAX_MOOV = 8 * 1024 * 1024;
export const VIDEO_PREVIEW_MAX_SAMPLE = 1_500_000;

export type MoovPlan =
  { kind: "ready" } | { kind: "range"; start: number; end: number } | { kind: "missing" };

export type PreviewSample = {
  offset: number;
  size: number;
  width: number;
  height: number;
  timescale: number;
  duration: number;
  /** Visual sample entry, including its box header. */
  sampleEntry: Uint8Array;
};

type Mp4Box = { type: string; start: number; size: number; header: number };

const MATRIX = new Uint8Array([
  0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x40, 0x00, 0x00, 0x00,
]);

function u32(bytes: Uint8Array, offset: number): number {
  return (
    (((bytes[offset] ?? 0) << 24) |
      ((bytes[offset + 1] ?? 0) << 16) |
      ((bytes[offset + 2] ?? 0) << 8) |
      (bytes[offset + 3] ?? 0)) >>>
    0
  );
}

function u64(bytes: Uint8Array, offset: number): number {
  return u32(bytes, offset) * 0x100000000 + u32(bytes, offset + 4);
}

function u16(bytes: Uint8Array, offset: number): number {
  return ((bytes[offset] ?? 0) << 8) | (bytes[offset + 1] ?? 0);
}

function ascii(bytes: Uint8Array, offset: number, length: number): string {
  let text = "";
  for (let index = 0; index < length; index += 1) {
    text += String.fromCharCode(bytes[offset + index] ?? 0);
  }
  return text;
}

function readBox(bytes: Uint8Array, offset: number): Mp4Box | null {
  if (offset < 0 || offset + 8 > bytes.length) return null;
  let size = u32(bytes, offset);
  let header = 8;
  if (size === 1) {
    if (offset + 16 > bytes.length) return null;
    size = u64(bytes, offset + 8);
    header = 16;
  }
  if (!Number.isFinite(size) || size < header) return null;
  return { type: ascii(bytes, offset + 4, 4), start: offset, size, header };
}

function boxes(bytes: Uint8Array, start: number, end: number): Mp4Box[] {
  const found: Mp4Box[] = [];
  let offset = start;
  const limit = Math.min(end, bytes.length);
  while (offset + 8 <= limit) {
    const box = readBox(bytes, offset);
    if (!box || offset + box.size > limit) break;
    found.push(box);
    offset += box.size;
  }
  return found;
}

function child(bytes: Uint8Array, parent: Mp4Box, type: string): Mp4Box | null {
  return (
    boxes(bytes, parent.start + parent.header, parent.start + parent.size).find(
      (box) => box.type === type
    ) ?? null
  );
}

/** Where the movie index lives. `ready` means it is already inside `head`. */
export function planMoovFetch(head: Uint8Array, fileSize: number): MoovPlan {
  let offset = 0;
  while (offset + 8 <= head.length) {
    const box = readBox(head, offset);
    if (!box) return { kind: "missing" };
    const end = offset + box.size;
    if (box.type === "moov") {
      if (end <= head.length) return { kind: "ready" };
      if (box.size > VIDEO_PREVIEW_MAX_MOOV || end > fileSize) return { kind: "missing" };
      return { kind: "range", start: offset, end: end - 1 };
    }
    if (end <= head.length) {
      offset = end;
      continue;
    }
    if ((box.type === "mdat" || box.type === "free") && end < fileSize) {
      const moovEnd = Math.min(fileSize, end + VIDEO_PREVIEW_MAX_MOOV);
      if (moovEnd <= end) return { kind: "missing" };
      return { kind: "range", start: end, end: moovEnd - 1 };
    }
    return { kind: "missing" };
  }
  return { kind: "missing" };
}

function sampleEntryAt(bytes: Uint8Array, stsd: Mp4Box, index: number): Uint8Array | null {
  const count = u32(bytes, stsd.start + stsd.header + 4);
  let offset = stsd.start + stsd.header + 8;
  const end = stsd.start + stsd.size;
  for (let entry = 0; entry < count; entry += 1) {
    if (offset + 8 > end) return null;
    const size = u32(bytes, offset);
    if (size < 8 || offset + size > end) return null;
    if (entry === index) {
      const copy = bytes.slice(offset, offset + size);
      // The rebuilt file has one self-contained data reference.
      copy[14] = 0;
      copy[15] = 1;
      return copy;
    }
    offset += size;
  }
  return null;
}

/** First video keyframe described by a buffer that contains a complete `moov`. */
export function locatePreviewSample(bytes: Uint8Array): PreviewSample | null {
  try {
    const moov = boxes(bytes, 0, bytes.length).find((box) => box.type === "moov");
    if (!moov) return null;
    for (const trak of boxes(bytes, moov.start + moov.header, moov.start + moov.size)) {
      if (trak.type !== "trak") continue;
      const mdia = child(bytes, trak, "mdia");
      const hdlr = mdia ? child(bytes, mdia, "hdlr") : null;
      if (!mdia || !hdlr || ascii(bytes, hdlr.start + hdlr.header + 8, 4) !== "vide") continue;
      const mdhd = child(bytes, mdia, "mdhd");
      const minf = child(bytes, mdia, "minf");
      const stbl = minf ? child(bytes, minf, "stbl") : null;
      if (!mdhd || !stbl) continue;
      const stsd = child(bytes, stbl, "stsd");
      const stts = child(bytes, stbl, "stts");
      const stsc = child(bytes, stbl, "stsc");
      const stsz = child(bytes, stbl, "stsz");
      const stco = child(bytes, stbl, "stco") ?? child(bytes, stbl, "co64");
      const stss = child(bytes, stbl, "stss");
      if (!stsd || !stts || !stsc || !stsz || !stco) continue;

      const version = bytes[mdhd.start + mdhd.header] ?? 0;
      const timescale =
        version === 1 ? u32(bytes, mdhd.start + mdhd.header + 20) : u32(bytes, mdhd.start + 20);
      const sampleDelta = u32(bytes, stts.start + 12) > 0 ? u32(bytes, stts.start + 20) : 0;
      const sampleSizeField = u32(bytes, stsz.start + 12);
      const sampleCount = u32(bytes, stsz.start + 16);
      if (sampleCount < 1 || timescale < 1) continue;
      const sync = stss && u32(bytes, stss.start + 12) > 0 ? u32(bytes, stss.start + 16) : 1;
      const key = Math.max(0, sync - 1);
      if (key >= sampleCount) continue;

      const stscCount = u32(bytes, stsc.start + 12);
      const chunkEntries: Array<{ first: number; count: number; description: number }> = [];
      for (let index = 0; index < stscCount; index += 1) {
        const at = stsc.start + 16 + index * 12;
        chunkEntries.push({
          first: u32(bytes, at),
          count: u32(bytes, at + 4),
          description: u32(bytes, at + 8),
        });
      }
      const chunkCount = u32(bytes, stco.start + 12);
      const wide = stco.type === "co64";
      const chunkOffsetAt = (index: number) => {
        const at = stco.start + 16 + index * (wide ? 8 : 4);
        return wide ? u64(bytes, at) : u32(bytes, at);
      };
      const sizeAt = (index: number) =>
        sampleSizeField > 0 ? sampleSizeField : u32(bytes, stsz.start + 20 + index * 4);

      let sampleIndex = 0;
      for (let chunk = 0; chunk < chunkCount; chunk += 1) {
        const entry = chunkEntries.filter((item) => item.first <= chunk + 1).at(-1);
        const perChunk = entry?.count ?? 0;
        if (perChunk < 1) break;
        if (sampleIndex + perChunk > key) {
          let offset = chunkOffsetAt(chunk);
          for (let step = 0; step < key - sampleIndex; step += 1)
            offset += sizeAt(sampleIndex + step);
          const size = sizeAt(key);
          const sampleEntry = sampleEntryAt(
            bytes,
            stsd,
            Math.max(0, (entry?.description ?? 1) - 1)
          );
          if (!sampleEntry || sampleEntry.length < 36 || size < 1) break;
          const width = u16(sampleEntry, 32);
          const height = u16(sampleEntry, 34);
          if (width < 1 || height < 1) break;
          return {
            offset,
            size,
            width,
            height,
            timescale,
            duration: sampleDelta > 0 ? sampleDelta : 1,
            sampleEntry,
          };
        }
        sampleIndex += perChunk;
      }
    }
  } catch {
    return null;
  }
  return null;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function be(value: number, width: number): Uint8Array {
  const out = new Uint8Array(width);
  let remaining = value;
  for (let index = width - 1; index >= 0; index -= 1) {
    out[index] = remaining & 0xff;
    remaining = Math.floor(remaining / 256);
  }
  return out;
}

function box(type: string, payload: Uint8Array): Uint8Array {
  const out = new Uint8Array(8 + payload.length);
  out.set(be(out.length, 4), 0);
  out[4] = type.charCodeAt(0);
  out[5] = type.charCodeAt(1);
  out[6] = type.charCodeAt(2);
  out[7] = type.charCodeAt(3);
  out.set(payload, 8);
  return out;
}

/** A one-sample MP4. `sample` is the keyframe bytes from `meta.offset`. */
export function buildPreviewMp4(sample: Uint8Array, meta: PreviewSample): Uint8Array {
  const { timescale, duration } = meta;
  const ftyp = box(
    "ftyp",
    concat([
      new Uint8Array([0x69, 0x73, 0x6f, 0x6d]),
      be(0x200, 4),
      new TextEncoder().encode("isomiso2avc1mp41"),
    ])
  );
  const mvhd = box(
    "mvhd",
    concat([
      new Uint8Array(12),
      be(timescale, 4),
      be(duration, 4),
      be(0x00010000, 4),
      be(0x0100, 2),
      new Uint8Array(10),
      MATRIX,
      new Uint8Array(24),
      be(2, 4),
    ])
  );
  const tkhd = box(
    "tkhd",
    concat([
      new Uint8Array([0, 0, 0, 3]),
      new Uint8Array(8),
      be(1, 4),
      new Uint8Array(4),
      be(duration, 4),
      new Uint8Array(16),
      MATRIX,
      be(meta.width * 0x10000, 4),
      be(meta.height * 0x10000, 4),
    ])
  );
  const mdhd = box(
    "mdhd",
    concat([
      new Uint8Array(12),
      be(timescale, 4),
      be(duration, 4),
      new Uint8Array([0x55, 0xc4, 0, 0]),
    ])
  );
  const hdlr = box(
    "hdlr",
    concat([
      new Uint8Array(8),
      new TextEncoder().encode("vide"),
      new Uint8Array(12),
      new TextEncoder().encode("VideoHandler\0"),
    ])
  );
  const vmhd = box("vmhd", concat([new Uint8Array([0, 0, 0, 1]), new Uint8Array(8)]));
  const url = box("url ", new Uint8Array([0, 0, 0, 1]));
  const dref = box("dref", concat([new Uint8Array(4), be(1, 4), url]));
  const dinf = box("dinf", dref);
  const stsd = box("stsd", concat([new Uint8Array(4), be(1, 4), meta.sampleEntry]));
  const stts = box("stts", concat([new Uint8Array(4), be(1, 4), be(1, 4), be(duration, 4)]));
  const stsc = box("stsc", concat([new Uint8Array(4), be(1, 4), be(1, 4), be(1, 4), be(1, 4)]));
  const stsz = box("stsz", concat([new Uint8Array(4), be(0, 4), be(1, 4), be(sample.length, 4)]));
  const stss = box("stss", concat([new Uint8Array(4), be(1, 4), be(1, 4)]));

  const assemble = (offset: number) => {
    const stco = box("stco", concat([new Uint8Array(4), be(1, 4), be(offset, 4)]));
    const stbl = box("stbl", concat([stsd, stts, stsc, stsz, stco, stss]));
    const minf = box("minf", concat([vmhd, dinf, stbl]));
    const mdia = box("mdia", concat([mdhd, hdlr, minf]));
    const trak = box("trak", concat([tkhd, mdia]));
    return box("moov", concat([mvhd, trak]));
  };

  const draft = assemble(0);
  const moov = assemble(ftyp.length + draft.length + 8);
  return concat([ftyp, moov, box("mdat", sample)]);
}
