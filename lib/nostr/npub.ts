const BECH32_CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
const BECH32_GENERATOR = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];

function bech32Polymod(values: number[]): number {
  let checksum = 1;
  for (const value of values) {
    const top = checksum >> 25;
    checksum = ((checksum & 0x1ffffff) << 5) ^ value;
    for (let index = 0; index < 5; index += 1) {
      if ((top >> index) & 1) {
        checksum ^= BECH32_GENERATOR[index] ?? 0;
      }
    }
  }
  return checksum;
}

function bech32HrpExpand(hrp: string): number[] {
  const values: number[] = [];
  for (let index = 0; index < hrp.length; index += 1) {
    values.push(hrp.charCodeAt(index) >> 5);
  }
  values.push(0);
  for (let index = 0; index < hrp.length; index += 1) {
    values.push(hrp.charCodeAt(index) & 31);
  }
  return values;
}

function bech32VerifyChecksum(hrp: string, data: number[]): boolean {
  return bech32Polymod([...bech32HrpExpand(hrp), ...data]) === 1;
}

function bech32Decode(value: string): { hrp: string; data: number[] } | null {
  if (!value || value.length < 8) return null;
  const lower = value.toLowerCase();
  const upper = value.toUpperCase();
  if (value !== lower && value !== upper) return null;

  const separatorIndex = lower.lastIndexOf("1");
  if (separatorIndex < 1 || separatorIndex + 7 > lower.length) return null;

  const hrp = lower.slice(0, separatorIndex);
  const dataPart = lower.slice(separatorIndex + 1);
  const data: number[] = [];
  for (const char of dataPart) {
    const index = BECH32_CHARSET.indexOf(char);
    if (index === -1) return null;
    data.push(index);
  }
  if (!bech32VerifyChecksum(hrp, data)) return null;

  return { hrp, data: data.slice(0, -6) };
}

function convertBits(
  data: number[],
  fromBits: number,
  toBits: number,
  pad: boolean
): number[] | null {
  let accumulator = 0;
  let bits = 0;
  const result: number[] = [];
  const maxValue = (1 << toBits) - 1;

  for (const value of data) {
    if (value < 0 || value >> fromBits !== 0) return null;
    accumulator = (accumulator << fromBits) | value;
    bits += fromBits;
    while (bits >= toBits) {
      bits -= toBits;
      result.push((accumulator >> bits) & maxValue);
    }
  }

  if (pad) {
    if (bits > 0) {
      result.push((accumulator << (toBits - bits)) & maxValue);
    }
  } else if (bits >= fromBits || ((accumulator << (toBits - bits)) & maxValue) !== 0) {
    return null;
  }

  return result;
}

export function npubToHex(npub: string): string | null {
  const decoded = bech32Decode(npub.trim());
  if (!decoded || decoded.hrp !== "npub") return null;
  const bytes = convertBits(decoded.data, 5, 8, false);
  if (!bytes || bytes.length === 0) return null;
  return bytes.map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
