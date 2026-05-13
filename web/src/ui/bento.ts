import type { AppState } from "../state";
import { updateStatsTiles } from "./tiles/stats-tiles";
import { updateRoseTile } from "./tiles/rose-tile";
import { updateSectorTile } from "./tiles/sector-tile";
import { updateHeatmapTile } from "./tiles/heatmap-tile";
import { updateTableTile } from "./tiles/table-tile";
import { updateDownloadTile } from "./tiles/download-tile";

export function updateBento(state: AppState): void {
  const empty = document.getElementById("empty-state")!;
  const errorEl = document.getElementById("error-banner")!;

  if (state.error) {
    errorEl.textContent = `Could not parse file: ${state.error}`;
    errorEl.hidden = false;
    empty.hidden = false;
    return;
  }

  errorEl.hidden = true;

  if (!state.tab) {
    empty.hidden = false;
    return;
  }

  const siteEl = document.getElementById("site-name");
  if (siteEl) siteEl.textContent = state.tab.siteName;

  updateStatsTiles(state);
  updateRoseTile(state);
  updateSectorTile(state);
  updateHeatmapTile(state);
  updateTableTile(state);
  updateDownloadTile(state);

  empty.hidden = true;
}
