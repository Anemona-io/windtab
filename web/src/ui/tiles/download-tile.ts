import Plotly from "plotly.js-dist-min";
import type { AppState } from "../../state";
import { toCsv, toJson, downloadBlob } from "../../convert";

export function initDownloadTile(): void {
  document.getElementById("btn-csv")?.addEventListener("click", () => {
    const state = (window as unknown as { __state: AppState }).__state;
    if (!state.tab) return;
    downloadBlob(toCsv(state.tab), stem(state.filename) + ".csv", "text/csv");
  });

  document.getElementById("btn-json")?.addEventListener("click", () => {
    const state = (window as unknown as { __state: AppState }).__state;
    if (!state.tab) return;
    downloadBlob(toJson(state.tab), stem(state.filename) + ".json", "application/json");
  });

  document.getElementById("btn-png")?.addEventListener("click", () => {
    const state = (window as unknown as { __state: AppState }).__state;
    if (!state.tab) return;
    const el = document.getElementById("rose-plot") as HTMLElement & { _fullLayout?: unknown };
    const siteName = state.tab.siteName;
    type RL = Parameters<typeof Plotly.relayout>[1];
    const dark = "#333333";
    Plotly.relayout(el, {
      "title.text": siteName,
      "title.font.color": dark,
      paper_bgcolor: "#ffffff",
      "polar.bgcolor": "#ffffff",
      "polar.radialaxis.color": dark,
      "polar.radialaxis.gridcolor": "#cccccc",
      "polar.angularaxis.color": dark,
      "polar.angularaxis.gridcolor": "#cccccc",
      "legend.font.color": dark,
      "legend.title.font.color": dark,
    } as RL)
      .then(() => Plotly.toImage(el, { format: "png", width: 900, height: 700 }))
      .then((url) => {
        Plotly.relayout(el, {
          "title.text": "",
          paper_bgcolor: "transparent",
          "polar.bgcolor": "transparent",
          "polar.radialaxis.color": "#b0b0b6",
          "polar.radialaxis.gridcolor": "#5a5a5a",
          "polar.angularaxis.color": "#b0b0b6",
          "polar.angularaxis.gridcolor": "#5a5a5a",
          "legend.font.color": "#b0b0b6",
          "legend.title.font.color": "#b0b0b6",
        } as RL);
        const a = document.createElement("a");
        a.href = url;
        a.download = stem(state.filename) + "_rose.png";
        a.click();
      });
  });
}

export function updateDownloadTile(state: AppState): void {
  const disabled = !state.tab;
  (["btn-csv", "btn-json", "btn-png"] as const).forEach((id) => {
    const el = document.getElementById(id) as HTMLButtonElement | null;
    if (el) el.disabled = disabled;
  });

  const filename = document.getElementById("download-filename");
  if (filename) filename.textContent = state.tab ? state.filename : "";
}

function stem(name: string): string {
  return name.replace(/\.[^.]+$/, "") || "windtab";
}
