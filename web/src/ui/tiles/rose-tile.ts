import type { AppState } from "../../state";
import { setSelectedSector, setEnergyWeighted } from "../../state";
import { renderRose } from "../../plots/rose";

export function initRoseTile(): void {
  const toggle = document.getElementById("energy-toggle") as HTMLInputElement;
  toggle?.addEventListener("change", () => {
    setEnergyWeighted(toggle.checked);
  });
}

export function updateRoseTile(state: AppState): void {
  if (!state.tab) return;
  const toggle = document.getElementById("energy-toggle") as HTMLInputElement;
  if (toggle) toggle.disabled = false;
  const el = document.getElementById("rose-plot")!;
  el.querySelector(".rose-placeholder")?.remove();
  renderRose(el, state.tab, state.energyWeighted, state.selectedSector, (i) => setSelectedSector(i));
}
