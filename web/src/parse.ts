export interface TabFile {
  siteName: string;
  x: number;
  y: number;
  height: number;
  nSectors: number;
  speedScale: number;
  directionOffset: number;
  /** length: nSectors — sector probabilities, sum ≈ 100 */
  sectorFrequencies: number[];
  /** length: nSpeeds — speed bin centres in m/s */
  speedBins: number[];
  /** shape: nSpeeds × nSectors — per-mille within each sector */
  frequencies: number[][];
}

export function parseTab(text: string): TabFile {
  const lines = text
    .split("\n")
    .map((l) => l.split("!")[0].trimEnd())
    .filter((l) => l.trim().length > 0);

  if (lines.length < 5) {
    throw new Error(`Expected at least 5 non-blank lines, got ${lines.length}`);
  }

  const siteName = lines[0].trim();
  const [x, y, height] = parseFloats(lines[1], 3, "line 2 (x y height)");
  const [nSectorsRaw, speedScale, directionOffset] = parseFloats(
    lines[2],
    3,
    "line 3 (n_sectors scale offset)"
  );
  const nSectors = Math.round(nSectorsRaw);
  const sectorFrequencies = parseFloats(lines[3], nSectors, "line 4 (sector frequencies)");

  const speedBins: number[] = [];
  const frequencies: number[][] = [];
  for (let i = 4; i < lines.length; i++) {
    const vals = parseFloats(lines[i], 1 + nSectors, `line ${i + 1}`);
    speedBins.push(vals[0]);
    frequencies.push(vals.slice(1));
  }

  return {
    siteName,
    x,
    y,
    height,
    nSectors,
    speedScale,
    directionOffset,
    sectorFrequencies,
    speedBins,
    frequencies,
  };
}

function parseFloats(line: string, n: number, context: string): number[] {
  const parts = line.trim().split(/\s+/);
  if (parts.length < n) {
    throw new Error(`Expected ${n} values in ${context}, got ${parts.length}: ${line}`);
  }
  return parts.slice(0, n).map((p) => {
    const v = parseFloat(p);
    if (isNaN(v)) throw new Error(`Non-numeric value in ${context}: ${p}`);
    return v;
  });
}
