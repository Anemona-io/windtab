import Plotly from "plotly.js-dist-min";
import type { TabFile } from "../parse";
import { fitWeibull, directions, degreesToCompass } from "../stats";

function weibullPdf(x: number, A: number, k: number): number {
  if (A <= 0 || k <= 0 || x <= 0) return 0;
  return (k / A) * Math.pow(x / A, k - 1) * Math.exp(-Math.pow(x / A, k));
}

export function renderWeibull(el: HTMLElement, tab: TabFile, sector: number): void {
  const speeds = tab.speedBins.map((s) => s * tab.speedScale);
  const obs = tab.frequencies.map((row) => row[sector] / 1000);
  const binWidth = speeds.length > 1 ? speeds[1] - speeds[0] : 1;
  const [A, k] = fitWeibull(tab, sector);
  const dir = directions(tab)[sector];

  const compass = degreesToCompass(dir);

  const traces: Partial<Plotly.Data>[] = [
    {
      type: "bar",
      x: speeds,
      y: obs.map((o) => o / binWidth),
      width: binWidth * 0.8,
      name: "Observed",
      marker: { color: "#A43E85", opacity: 0.7 },
      hovertemplate: "%{x:.1f} m/s, %{y:.4f}<extra>Observed</extra>",
    },
  ];

  if (A > 0 && k > 0) {
    const xMax = speeds[speeds.length - 1] * 1.2;
    const nPts = 300;
    const xFit = Array.from({ length: nPts }, (_, i) => (i / (nPts - 1)) * xMax);
    const yFit = xFit.map((x) => weibullPdf(x, A, k));
    traces.push({
      type: "scatter",
      x: xFit,
      y: yFit,
      mode: "lines",
      name: `Weibull A=${A.toFixed(2)} k=${k.toFixed(2)}`,
      line: { color: "#DD8D57", width: 2 },
      hovertemplate: "%{x:.1f} m/s, %{y:.4f}<extra>Weibull fit</extra>",
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
