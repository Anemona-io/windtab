import type { AppState } from "../../state";
import { renderHeatmap } from "../../plots/heatmap";
import { setSelectedSector } from "../../state";

export function updateHeatmapTile(state: AppState): void {
  if (!state.tab) return;
  const el = document.getElementById("heatmap-plot")!;
  renderHeatmap(el, state.tab, state.selectedSector, (i) => setSelectedSector(i));
}
