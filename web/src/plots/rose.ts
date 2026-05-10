import Plotly from "plotly.js-dist-min";
import type { TabFile } from "../parse";
import { jointProbabilities, directions, meanSpeed, degreesToCompass } from "../stats";

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

function sampleColorscale(n: number): string[] {
  if (n === 1) return [PLASMA_STOPS[PLASMA_STOPS.length - 1]];
  return Array.from({ length: n }, (_, i) => plasmaAt(i / (n - 1)));
}

type RoseEl = HTMLElement & {
  __roseHandlers?: {
    thetaLabels: string[];
    dirs: number[];
    onSectorClick: (i: number | null) => void;
  };
};

export function renderRose(
  el: RoseEl,
  tab: TabFile,
  energyWeighted: boolean,
  selectedSector: number | null,
  onSectorClick: (sector: number | null) => void
): void {
  const speeds = tab.speedBins.map((s) => s * tab.speedScale);
  const joint = jointProbabilities(tab);
  const nSpeeds = speeds.length;
  const dirs = directions(tab);
  // Compass labels for axis and click resolution
  const thetaLabels = dirs.map(degreesToCompass);
  const colors = sampleColorscale(nSpeeds);

  // Store current handlers so the single registered listener always calls the latest
  el.__roseHandlers = { thetaLabels, dirs, onSectorClick };

  const barHeights: number[][] = joint.map((row, si) =>
    row.map((p) =>
      energyWeighted ? p * Math.pow(speeds[si], 3) : p * 100
    )
  );

  const rLabel = energyWeighted ? "Energy proxy" : "Frequency (%)";
  const speedStep = nSpeeds > 1 ? speeds[1] - speeds[0] : 1;

  // Per-sector opacity: dim non-selected sectors when one is active
  const opacities = dirs.map((_, j) =>
    selectedSector !== null ? (j === selectedSector ? 0.9 : 0.2) : 0.85
  );

  // Per-sector mean speed and frequency for tooltip
  const sectorMeans = dirs.map((_, j) => meanSpeed(tab, j).toFixed(1));
  const sectorFreqs = tab.sectorFrequencies.map((f) => f.toFixed(1));

  const traces: Partial<Plotly.Data>[] = Array.from({ length: nSpeeds }, (_, i) => ({
    type: "barpolar" as const,
    r: barHeights[i],
    theta: thetaLabels,
    name:
      nSpeeds > 1
        ? `${speeds[i].toFixed(0)}–${(speeds[i] + speedStep).toFixed(0)} m/s`
        : `${speeds[i].toFixed(0)} m/s`,
    marker: { color: colors[i], opacity: opacities },
    // customdata[0]=compassDir, [1]=meanSpeed, [2]=frequency
    customdata: dirs.map((_, j) => [thetaLabels[j], sectorMeans[j], sectorFreqs[j]]),
    hovertemplate:
      "<b>%{customdata[0]}</b><br>" +
      "Freq: %{customdata[2]}%<br>" +
      "Mean: %{customdata[1]} m/s" +
      "<extra>%{data.name}</extra>",
  }));

  // Prevailing wind direction indicator
  const prevIdx = tab.sectorFrequencies.reduce(
    (maxI, f, i) => (f > tab.sectorFrequencies[maxI] ? i : maxI), 0
  );
  const prevCompass = thetaLabels[prevIdx];
  const prevFreq = tab.sectorFrequencies[prevIdx];
  const prevR = barHeights.reduce((sum, row) => sum + row[prevIdx], 0);

  traces.push({
    type: "scatterpolar" as const,
    r: [0, prevR * 1.08],
    theta: [thetaLabels[prevIdx], thetaLabels[prevIdx]],
    mode: "lines+markers" as const,
    marker: { size: [0, 9], symbol: "triangle-up", color: "#EDBE4F" },
    line: { color: "#EDBE4F", width: 2.5, dash: "dot" as const },
    name: `Prevailing: ${prevCompass} (${prevFreq.toFixed(1)}%)`,
    showlegend: true,
    hovertemplate: `Prevailing: ${prevCompass}<br>${prevFreq.toFixed(1)}% of time<extra></extra>`,
  } as Partial<Plotly.Data>);

  const layout: Partial<Plotly.Layout> = {
    polar: {
      bgcolor: "transparent",
      radialaxis: {
        title: { text: rLabel },
        color: "#b0b0b6",
        gridcolor: "#5a5a5a",
      },
      angularaxis: {
        direction: "clockwise" as const,
        rotation: 90,
        color: "#b0b0b6",
        gridcolor: "#5a5a5a",
      },
    },
    showlegend: true,
    legend: {
      title: { text: "Speed bin", font: { color: "#b0b0b6" } },
      font: { color: "#b0b0b6" },
    },
    paper_bgcolor: "transparent",
    plot_bgcolor: "transparent",
    margin: { t: 30, b: 10, l: 10, r: 10 },
    height: undefined,
  };

  Plotly.react(el, traces, layout, { responsive: true, displayModeBar: false }).then(
    (gd) => {
      // Register handlers only once; subsequent renders update __roseHandlers above
      if (!(el as RoseEl & { __roseClickRegistered?: boolean }).__roseClickRegistered) {
        (el as RoseEl & { __roseClickRegistered?: boolean }).__roseClickRegistered = true;

        // Flag prevents the DOM click from firing a deselect right after a bar click
        let barJustClicked = false;

        gd.on("plotly_click", (data: Plotly.PlotMouseEvent) => {
          barJustClicked = true;
          setTimeout(() => { barJustClicked = false; }, 0);
          const pt = data.points[0];
          const rawTheta = (pt as unknown as { theta: unknown }).theta;
          const h = el.__roseHandlers!;
          let idx = h.thetaLabels.indexOf(String(rawTheta));
          if (idx < 0) {
            // Fallback: Plotly may return the numeric angle instead of the label
            const angle = ((Number(rawTheta) % 360) + 360) % 360;
            if (!isNaN(angle)) {
              idx = h.dirs.findIndex((d) => Math.round(d) === Math.round(angle));
            }
          }
          if (idx >= 0) h.onSectorClick(idx);
        });

        // Click on empty polar area → clear selection
        el.addEventListener("click", () => {
          if (!barJustClicked) el.__roseHandlers?.onSectorClick(null);
        });
      }
    }
  );
}
