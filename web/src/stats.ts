import type { TabFile } from "./parse";

const COMPASS_16 = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"] as const;

export function degreesToCompass(deg: number): string {
  return COMPASS_16[Math.round(((deg % 360) + 360) % 360 / 22.5) % 16];
}

export function directions(tab: TabFile): number[] {
  const step = 360 / tab.nSectors;
  return Array.from(
    { length: tab.nSectors },
    (_, i) => ((tab.directionOffset + i * step) % 360)
  );
}

export function jointProbabilities(tab: TabFile): number[][] {
  // shape: nSpeeds × nSectors, values sum to 1 over full array
  return tab.frequencies.map((row, _si) =>
    row.map((f, j) => (f / 1000) * (tab.sectorFrequencies[j] / 100))
  );
}

export function meanSpeed(tab: TabFile, sector?: number): number {
  const speeds = tab.speedBins.map((s) => s * tab.speedScale);
  let weights: number[];
  if (sector !== undefined) {
    weights = tab.frequencies.map((row) => row[sector] / 1000);
  } else {
    const joint = jointProbabilities(tab);
    weights = joint.map((row) => row.reduce((a, b) => a + b, 0));
  }
  const total = weights.reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  const sum = speeds.reduce((acc, s, i) => acc + s * weights[i], 0);
  return sum / total;
}

/**
 * Fit a 2-parameter Weibull (floc=0) to the speed distribution.
 * Returns [A, k] (scale m/s, shape).
 *
 * Uses weighted MLE: Newton-Raphson on the log-likelihood derivative for k,
 * then closed-form A. Weights are the within-sector conditional frequencies.
 */
export function fitWeibull(tab: TabFile, sector?: number): [number, number] {
  const speeds = tab.speedBins.map((s) => s * tab.speedScale);
  let weights: number[];
  if (sector !== undefined) {
    weights = tab.frequencies.map((row) => row[sector] / 1000);
  } else {
    const joint = jointProbabilities(tab);
    weights = joint.map((row) => row.reduce((a, b) => a + b, 0));
  }

  // Filter zero-speed bins (ln(0) undefined)
  const xs: number[] = [];
  const ws: number[] = [];
  for (let i = 0; i < speeds.length; i++) {
    if (speeds[i] > 0 && weights[i] > 0) {
      xs.push(speeds[i]);
      ws.push(weights[i]);
    }
  }
  if (xs.length < 2) return [0, 0];

  const wSum = ws.reduce((a, b) => a + b, 0);
  if (wSum === 0) return [0, 0];

  // Newton-Raphson for shape k
  // g(k) = 1/k + Σwᵢlnxᵢ/Σwᵢ − Σwᵢxᵢᵏlnxᵢ / Σwᵢxᵢᵏ = 0
  const lnx = xs.map(Math.log);
  let k = 2.0;
  for (let iter = 0; iter < 200; iter++) {
    const xk = xs.map((x) => Math.pow(x, k));
    const wxk = xk.map((v, i) => ws[i] * v);
    const wxkSum = wxk.reduce((a, b) => a + b, 0);
    const wxklnx = wxk.map((v, i) => v * lnx[i]).reduce((a, b) => a + b, 0);
    const wlnxSum = ws.map((w, i) => w * lnx[i]).reduce((a, b) => a + b, 0);

    const g = 1 / k + wlnxSum / wSum - wxklnx / wxkSum;

    // g'(k) = -1/k² − [Σwᵢxᵢᵏ(lnxᵢ)² · Σwᵢxᵢᵏ − (Σwᵢxᵢᵏlnxᵢ)²] / (Σwᵢxᵢᵏ)²
    const wxkln2x = wxk.map((v, i) => v * lnx[i] * lnx[i]).reduce((a, b) => a + b, 0);
    const gp = -1 / (k * k) - (wxkln2x * wxkSum - wxklnx * wxklnx) / (wxkSum * wxkSum);

    if (Math.abs(gp) < 1e-15) break;
    const kNew = k - g / gp;
    if (kNew <= 0) { k = k / 2; continue; }
    const dk = Math.abs(kNew - k);
    k = kNew;
    if (dk < 1e-10) break;
  }

  const xk = xs.map((x) => Math.pow(x, k));
  const wxkSum = xk.map((v, i) => ws[i] * v).reduce((a, b) => a + b, 0);
  const A = Math.pow(wxkSum / wSum, 1 / k);

  return [A, k];
}

export interface SectorStats {
  sector: number;
  directionDeg: number;
  frequencyPct: number;
  meanSpeedMs: number;
  weibullA: number;
  weibullK: number;
}

export function sectorSummary(tab: TabFile): SectorStats[] {
  const dirs = directions(tab);
  return dirs.map((dir, i) => {
    const [A, k] = fitWeibull(tab, i);
    return {
      sector: i,
      directionDeg: Math.round(dir * 10) / 10,
      frequencyPct: Math.round(tab.sectorFrequencies[i] * 100) / 100,
      meanSpeedMs: Math.round(meanSpeed(tab, i) * 100) / 100,
      weibullA: Math.round(A * 1000) / 1000,
      weibullK: Math.round(k * 1000) / 1000,
    };
  });
}

export interface OverallStats {
  siteName: string;
  heightM: number;
  nSectors: number;
  meanSpeedMs: number;
  weibullA: number;
  weibullK: number;
}

export function overallSummary(tab: TabFile): OverallStats {
  const [A, k] = fitWeibull(tab);
  return {
    siteName: tab.siteName,
    heightM: tab.height,
    nSectors: tab.nSectors,
    meanSpeedMs: Math.round(meanSpeed(tab) * 100) / 100,
    weibullA: Math.round(A * 1000) / 1000,
    weibullK: Math.round(k * 1000) / 1000,
  };
}
