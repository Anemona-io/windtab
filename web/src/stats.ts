import type { TabFile } from "./parse";

const COMPASS_16 = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"] as const;

// Lanczos approximation, g=7 (Numerical Recipes coefficients)
function gammaFn(z: number): number {
  if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * gammaFn(1 - z));
  z -= 1;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  let x = c[0];
  for (let i = 1; i < 9; i++) x += c[i] / (z + i);
  const t = z + 7.5;
  return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
}

export type FitMethod = "mle" | "mom" | "ls" | "justus";

export const FIT_METHODS: { id: FitMethod; label: string; color: string }[] = [
  { id: "mle",    label: "MLE",           color: "#DD8D57" },
  { id: "mom",    label: "Moments",       color: "#4FC3F7" },
  { id: "ls",     label: "Least Squares", color: "#81C784" },
  { id: "justus", label: "Justus",        color: "#CE93D8" },
];

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

function extractSpeedsAndWeights(
  tab: TabFile,
  sector?: number
): { xs: number[]; ws: number[]; wSum: number } {
  const speeds = tab.speedBins.map((s) => s * tab.speedScale);
  let weights: number[];
  if (sector !== undefined) {
    weights = tab.frequencies.map((row) => row[sector] / 1000);
  } else {
    const joint = jointProbabilities(tab);
    weights = joint.map((row) => row.reduce((a, b) => a + b, 0));
  }
  const xs: number[] = [];
  const ws: number[] = [];
  for (let i = 0; i < speeds.length; i++) {
    if (speeds[i] > 0 && weights[i] > 0) {
      xs.push(speeds[i]);
      ws.push(weights[i]);
    }
  }
  const wSum = ws.reduce((a, b) => a + b, 0);
  return { xs, ws, wSum };
}

function fitWeibullMoM(tab: TabFile, sector?: number): [number, number] {
  const { xs, ws, wSum } = extractSpeedsAndWeights(tab, sector);
  if (xs.length < 2 || wSum === 0) return [0, 0];

  const mu = xs.reduce((acc, x, i) => acc + x * ws[i], 0) / wSum;
  const variance = xs.reduce((acc, x, i) => acc + ws[i] * (x - mu) ** 2, 0) / wSum;
  if (mu <= 0 || variance <= 0) return [0, 0];

  const cv2 = variance / (mu * mu);
  const target = 1 + cv2;

  // f(k) = Γ(1+2/k)/Γ(1+1/k)² − target, monotone decreasing in k
  const f = (k: number) => {
    const g1 = gammaFn(1 + 1 / k);
    return gammaFn(1 + 2 / k) / (g1 * g1) - target;
  };

  let lo = 0.1, hi = 100;
  if (f(lo) < 0) return [0, 0];
  for (let iter = 0; iter < 100; iter++) {
    const mid = (lo + hi) / 2;
    if (f(mid) > 0) lo = mid; else hi = mid;
    if (hi - lo < 1e-8) break;
  }
  const k = (lo + hi) / 2;
  const A = mu / gammaFn(1 + 1 / k);
  return [A, k];
}

function fitWeibullLS(tab: TabFile, sector?: number): [number, number] {
  const speeds = tab.speedBins.map((s) => s * tab.speedScale);
  let weights: number[];
  if (sector !== undefined) {
    weights = tab.frequencies.map((row) => row[sector] / 1000);
  } else {
    const joint = jointProbabilities(tab);
    weights = joint.map((row) => row.reduce((a, b) => a + b, 0));
  }

  const wSum = weights.reduce((a, b) => a + b, 0);
  if (wSum === 0) return [0, 0];

  const Xs: number[] = [];
  const Ys: number[] = [];
  const Ws: number[] = [];
  let cumW = 0;
  for (let i = 0; i < speeds.length; i++) {
    const w = weights[i] / wSum;
    const F = cumW + w / 2; // midpoint CDF
    cumW += w;
    if (speeds[i] <= 0 || weights[i] <= 0 || F <= 0 || F >= 1) continue;
    Xs.push(Math.log(speeds[i]));
    Ys.push(Math.log(-Math.log(1 - F)));
    Ws.push(weights[i]);
  }
  if (Xs.length < 2) return [0, 0];

  const sw   = Ws.reduce((a, b) => a + b, 0);
  const swx  = Ws.reduce((acc, w, i) => acc + w * Xs[i], 0);
  const swx2 = Ws.reduce((acc, w, i) => acc + w * Xs[i] * Xs[i], 0);
  const swy  = Ws.reduce((acc, w, i) => acc + w * Ys[i], 0);
  const swxy = Ws.reduce((acc, w, i) => acc + w * Xs[i] * Ys[i], 0);

  const det = sw * swx2 - swx * swx;
  if (Math.abs(det) < 1e-15) return [0, 0];

  const k = (sw * swxy - swx * swy) / det;
  if (k <= 0) return [0, 0];
  const b = (swy - k * swx) / sw;
  const A = Math.exp(-b / k);
  return [A, k];
}

function fitWeibullJustus(tab: TabFile, sector?: number): [number, number] {
  const { xs, ws, wSum } = extractSpeedsAndWeights(tab, sector);
  if (xs.length < 1 || wSum === 0) return [0, 0];

  const mu = xs.reduce((acc, x, i) => acc + x * ws[i], 0) / wSum;
  const variance = xs.reduce((acc, x, i) => acc + ws[i] * (x - mu) ** 2, 0) / wSum;
  if (mu <= 0 || variance <= 0) return [0, 0];

  const k = Math.pow(Math.sqrt(variance) / mu, -1.086);
  const A = mu / gammaFn(1 + 1 / k);
  return [A, k];
}

export function fitWeibullByMethod(
  method: FitMethod,
  tab: TabFile,
  sector?: number
): [number, number] {
  switch (method) {
    case "mle":    return fitWeibull(tab, sector);
    case "mom":    return fitWeibullMoM(tab, sector);
    case "ls":     return fitWeibullLS(tab, sector);
    case "justus": return fitWeibullJustus(tab, sector);
  }
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
