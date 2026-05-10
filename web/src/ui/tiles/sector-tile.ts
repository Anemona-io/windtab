import type { AppState } from "../../state";
import { setSelectedSector } from "../../state";
import { renderWeibull } from "../../plots/weibull";
import { directions, fitWeibull } from "../../stats";

export function updateSectorTile(state: AppState): void {
  if (!state.tab) return;
  const tab = state.tab;
  // When nothing is explicitly selected, show sector 0 in this tile but
  // don't treat it as a cross-highlighted selection.
  const s = state.selectedSector ?? 0;

  // Update selector options if tab changed
  const sel = document.getElementById("sector-select") as HTMLSelectElement;
  if (sel.dataset.nSectors !== String(tab.nSectors)) {
    const dirs = directions(tab);
    sel.innerHTML = dirs
      .map((d, i) => `<option value="${i}">${i}: ${d.toFixed(0)}°</option>`)
      .join("");
    sel.dataset.nSectors = String(tab.nSectors);
  }
  sel.value = String(s);

  // Update A/k badge
  const [A, k] = fitWeibull(tab, s);
  const badge = document.getElementById("sector-weibull-badge");
  if (badge) badge.textContent = `A=${A.toFixed(2)}  k=${k.toFixed(2)}`;

  // Render Weibull plot
  const plotEl = document.getElementById("sector-plot")!;
  renderWeibull(plotEl, tab, s);
}

export function initSectorTile(): void {
  const sel = document.getElementById("sector-select") as HTMLSelectElement;
  sel?.addEventListener("change", () => {
    setSelectedSector(Number(sel.value));
  });
}
