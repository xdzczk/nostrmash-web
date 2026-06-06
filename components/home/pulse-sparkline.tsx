// A signature "live monitor" sparkline. Deterministic from a seed string, so
// server and client render identically (no hydration risk) and each metric gets
// its own stable waveform. Pure SVG + CSS — ships no JavaScript. The bright
// segment travelling along the trace (`.nm-spark-trace`) reads as a live feed.

const WIDTH = 120;
const HEIGHT = 36;
const POINTS = 14;
const TOP = 6;
const BOTTOM = 30;

function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildPoints(seed: string): Array<{ x: number; y: number }> {
  const rand = mulberry32(hashSeed(seed));
  const phase = rand() * Math.PI * 2;
  const freq = 0.7 + rand() * 0.8;
  const amp = 4.5 + rand() * 4;
  const mid = (TOP + BOTTOM) / 2;
  const points: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < POINTS; i += 1) {
    const x = (WIDTH / (POINTS - 1)) * i;
    const wave = Math.sin(i * freq + phase) * amp;
    const noise = (rand() - 0.5) * 6;
    const y = Math.min(BOTTOM, Math.max(TOP, mid + wave + noise));
    points.push({ x, y: Number(y.toFixed(2)) });
  }
  return points;
}

// Catmull-Rom -> cubic Bézier for an organic, premium-feeling curve.
function smoothPath(points: Array<{ x: number; y: number }>): string {
  const first = points[0];
  if (points.length < 2 || !first) return "";
  let d = `M ${first.x} ${first.y}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p1 = points[i];
    const p2 = points[i + 1];
    if (!p1 || !p2) continue;
    const p0 = points[i - 1] ?? p1;
    const p3 = points[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x} ${p2.y}`;
  }
  return d;
}

export function PulseSparkline({ seed, className = "" }: { seed: string; className?: string }) {
  const points = buildPoints(seed);
  const line = smoothPath(points);
  const area = `${line} L ${WIDTH} ${HEIGHT} L 0 ${HEIGHT} Z`;
  const last = points[points.length - 1] ?? { x: WIDTH, y: (TOP + BOTTOM) / 2 };

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none"
      aria-hidden
      className={`h-9 w-full overflow-visible ${className}`.trim()}
    >
      <path d={area} className="fill-accent" opacity={0.08} />
      <path
        d={line}
        fill="none"
        className="stroke-accent-soft"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.32}
      />
      <path
        d={line}
        pathLength={100}
        fill="none"
        className="nm-spark-trace stroke-accent"
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last.x} cy={last.y} r={3.4} className="fill-accent" opacity={0.18} />
      <circle cx={last.x} cy={last.y} r={1.9} className="nm-spark-dot fill-accent-soft" />
    </svg>
  );
}
