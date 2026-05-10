import Plotly from "plotly.js-dist-min";
import type { TabFile } from "../parse";
import { jointProbabilities, directions } from "../stats";

const PLASMA_STOPS = [
  "#1D1981", "#4F269C", "#7D2F9F", "#A43E85",
  "#C3646A", "#DD8D57", "#EDBE4F", "#F9DB46",
];

function hexToRgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

function plasmaAt(t: number): string {
  const scaled = t * (PLASMA_STOPS.length - 1);
  const lo = Math.min(Math.floor(scaled), PLASMA_STOPS.length - 2);
  const f = scaled - lo;
  const [r0, g0, b0] = hexToRgb(PLASMA_STOPS[lo]);
  const [r1, g1, b1] = hexToRgb(PLASMA_STOPS[lo + 1]);
  return "#" + [r0 + f * (r1 - r0), g0 + f * (g1 - g0), b0 + f * (b1 - b0)]
    .map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
}

const N_STOPS = 20;
const PLASMA: [number, string][] = Array.from({ length: N_STOPS }, (_, i) => {
  const t = i / (N_STOPS - 1);
  return [t, plasmaAt(t)];
});

type HeatEl = HTMLElement & { __heatHandlers?: { xLabels: string[]; onSectorClick: (i: number | null) => void } };

export function renderHeatmap(
  el: HeatEl,
  tab: TabFile,
  selectedSector: number | null,
  onSectorClick: (sector: number | null) => void
): void {
  const joint = jointProbabilities(tab);
  const dirs = directions(tab);
  const speeds = tab.speedBins.map((s) => s * tab.speedScale);

  const z = joint.map((row) => row.map((p) => p * 100));
  const xLabels = dirs.map((d) => `${d.toFixed(0)}°`);

  // Keep handlers fresh for click resolution
  el.__heatHandlers = { xLabels, onSectorClick };
  const yLabels = speeds.map((s) => s.toFixed(1));

  // Highlight selected sector column with a shape overlay
  const shapes: Partial<Plotly.Shape>[] = [];
  if (selectedSector !== null) {
    shapes.push({
      type: "rect",
      xref: "x",
      yref: "paper",
      x0: selectedSector - 0.5,
      x1: selectedSector + 0.5,
      y0: 0,
      y1: 1,
      fillcolor: "rgba(221, 141, 87, 0.15)",
      line: { color: "#DD8D57", width: 1 },
    });
  }

  const traces: Partial<Plotly.Data>[] = [
    {
      type: "heatmap",
      z,
      x: xLabels,
      y: yLabels,
      colorscale: PLASMA,
      colorbar: {
        title: { text: "Joint prob (%)", font: { color: "#b0b0b6" } },
        tickfont: { color: "#b0b0b6" },
      },
      hovertemplate: "Dir: %{x}<br>Speed: %{y} m/s<br>%{z:.3f}%<extra></extra>",
    } as Partial<Plotly.Data>,
  ];

  const layout: Partial<Plotly.Layout> = {
    xaxis: {
      title: { text: "Direction sector" },
      color: "#b0b0b6",
      gridcolor: "#5a5a5a",
    },
    yaxis: {
      title: { text: "Wind speed (m/s)" },
      color: "#b0b0b6",
      gridcolor: "#5a5a5a",
    },
    shapes,
    paper_bgcolor: "transparent",
    plot_bgcolor: "transparent",
    margin: { t: 10, b: 50, l: 60, r: 10 },
    height: undefined,
  };

  Plotly.react(el, traces, layout, { responsive: true, displayModeBar: false }).then((gd) => {
    if (!(el as HeatEl & { __heatClickRegistered?: boolean }).__heatClickRegistered) {
      (el as HeatEl & { __heatClickRegistered?: boolean }).__heatClickRegistered = true;

      let cellJustClicked = false;

      gd.on("plotly_click", (data: Plotly.PlotMouseEvent) => {
        cellJustClicked = true;
        setTimeout(() => { cellJustClicked = false; }, 0);
        const pt = data.points[0];
        const xVal = (pt as unknown as { x: string }).x;
        const h = el.__heatHandlers!;
        const idx = h.xLabels.indexOf(xVal);
        if (idx >= 0) h.onSectorClick(idx);
      });

      // Click on empty heatmap area → clear selection
      el.addEventListener("click", () => {
        if (!cellJustClicked) el.__heatHandlers?.onSectorClick(null);
      });
    }
  });
}
