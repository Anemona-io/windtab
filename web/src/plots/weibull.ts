import Plotly from "plotly.js-dist-min";
import type { TabFile } from "../parse";
import { directions, degreesToCompass, fitWeibullByMethod, FIT_METHODS } from "../stats";
import type { FitMethod } from "../stats";

function weibullPdf(x: number, A: number, k: number): number {
  if (A <= 0 || k <= 0 || x <= 0) return 0;
  return (k / A) * Math.pow(x / A, k - 1) * Math.exp(-Math.pow(x / A, k));
}

export function renderWeibull(
  el: HTMLElement,
  tab: TabFile,
  sector: number,
  enabledMethods: FitMethod[]
): void {
  const speeds = tab.speedBins.map((s) => s * tab.speedScale);
  const obs = tab.frequencies.map((row) => row[sector] / 1000);
  const binWidth = speeds.length > 1 ? speeds[1] - speeds[0] : 1;
  const dir = directions(tab)[sector];
  const compass = degreesToCompass(dir);

  // Normalize so histogram integrates to 1 (matches the PDF scale), regardless
  // of whether the conditional frequencies in the file sum to exactly 1000.
  const obsTotal = obs.reduce((a, b) => a + b, 0);
  const obsNorm = obsTotal > 0 ? obs.map((o) => o / obsTotal) : obs;

  const xMax = speeds[speeds.length - 1] * 1.2;
  const nPts = 300;
  const xFit = Array.from({ length: nPts }, (_, i) => (i / (nPts - 1)) * xMax);

  const traces: Partial<Plotly.Data>[] = [
    {
      type: "bar",
      x: speeds,
      y: obsNorm.map((o) => o / binWidth),
      width: binWidth * 0.8,
      name: "Observed",
      marker: { color: "#A43E85", opacity: 0.7 },
      hovertemplate: "%{x:.1f} m/s, %{y:.4f}<extra>Observed</extra>",
    },
  ];

  for (const method of FIT_METHODS) {
    if (!enabledMethods.includes(method.id)) continue;
    const [A, k] = fitWeibullByMethod(method.id, tab, sector);
    if (A <= 0 || k <= 0) continue;
    traces.push({
      type: "scatter",
      x: xFit,
      y: xFit.map((x) => weibullPdf(x, A, k)),
      mode: "lines",
      name: `${method.label} A=${A.toFixed(2)} k=${k.toFixed(2)}`,
      line: { color: method.color, width: 2 },
      hovertemplate: `%{x:.1f} m/s, %{y:.4f}<extra>${method.label}</extra>`,
    });
  }

  const layout: Partial<Plotly.Layout> = {
    title: {
      text: `${compass} · Sector ${sector} (${dir.toFixed(0)}°)`,
      font: { color: "#e5e7eb", size: 13 },
    },
    xaxis: {
      title: { text: "Wind speed (m/s)" },
      color: "#b0b0b6",
      gridcolor: "#5a5a5a",
    },
    yaxis: {
      title: { text: "Probability density" },
      color: "#b0b0b6",
      gridcolor: "#5a5a5a",
    },
    paper_bgcolor: "transparent",
    plot_bgcolor: "transparent",
    legend: { font: { color: "#b0b0b6", size: 10 } },
    margin: { t: 36, b: 40, l: 50, r: 10 },
    height: undefined,
  };

  Plotly.react(el, traces, layout, { responsive: true, displayModeBar: false });
}
