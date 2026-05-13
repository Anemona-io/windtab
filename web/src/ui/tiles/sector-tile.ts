import type { AppState } from "../../state";
import { setSelectedSector } from "../../state";
import { renderWeibull } from "../../plots/weibull";
import { directions, fitWeibull, FIT_METHODS } from "../../stats";
import type { FitMethod } from "../../stats";

const enabledMethods = new Set<FitMethod>(["mle", "mom", "ls", "justus"]);

export function updateSectorTile(state: AppState): void {
  if (!state.tab) return;
  const tab = state.tab;
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
  sel.disabled = false;
  sel.value = String(s);
  document
    .querySelectorAll<HTMLInputElement>(".fit-method-checkboxes input[type=\"checkbox\"]")
    .forEach((cb) => { cb.disabled = false; });

  // Update MLE badge
  const [A, k] = fitWeibull(tab, s);
  const badge = document.getElementById("sector-weibull-badge");
  if (badge) badge.textContent = `MLE: A=${A.toFixed(2)}  k=${k.toFixed(2)}`;

  // Render Weibull plot with all enabled methods
  const plotEl = document.getElementById("sector-plot")!;
  renderWeibull(plotEl, tab, s, Array.from(enabledMethods));
}

export function initSectorTile(): void {
  const sel = document.getElementById("sector-select") as HTMLSelectElement;
  sel?.addEventListener("change", () => {
    setSelectedSector(Number(sel.value));
  });

  document
    .querySelectorAll<HTMLInputElement>('.fit-method-checkboxes input[type="checkbox"]')
    .forEach((cb) => {
      cb.addEventListener("change", () => {
        const method = cb.dataset.method as FitMethod;
        if (!FIT_METHODS.some((m) => m.id === method)) return;
        if (cb.checked) {
          enabledMethods.add(method);
        } else {
          enabledMethods.delete(method);
        }
        const state = (window as unknown as Record<string, unknown>).__state as AppState;
        if (state?.tab) {
          const s = state.selectedSector ?? 0;
          const plotEl = document.getElementById("sector-plot")!;
          renderWeibull(plotEl, state.tab, s, Array.from(enabledMethods));
        }
      });
    });
}
