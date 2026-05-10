import type { AppState } from "../../state";
import { sectorSummary } from "../../stats";
import { setSelectedSector } from "../../state";

export function updateTableTile(state: AppState): void {
  if (!state.tab) return;
  const stats = sectorSummary(state.tab);
  const tbody = document.getElementById("sector-table-body")!;

  const prevIdx = stats.reduce((mi, s, i) => (s.frequencyPct > stats[mi].frequencyPct ? i : mi), 0);

  tbody.innerHTML = stats
    .map(
      (s, i) => {
        const classes = [
          s.sector === state.selectedSector ? "selected" : "",
          i === prevIdx ? "prevailing" : "",
        ].filter(Boolean).join(" ");
        return `
      <tr class="${classes}" data-sector="${s.sector}">
        <td>${s.sector}</td>
        <td>${s.directionDeg.toFixed(1)}°</td>
        <td>${s.frequencyPct.toFixed(2)}</td>
        <td>${s.meanSpeedMs.toFixed(2)}</td>
        <td>${s.weibullA.toFixed(3)}</td>
        <td>${s.weibullK.toFixed(3)}</td>
      </tr>`;
      }
    )
    .join("");

  tbody.querySelectorAll("tr[data-sector]").forEach((row) => {
    row.addEventListener("click", () => {
      const i = Number((row as HTMLElement).dataset.sector);
      setSelectedSector(i);
    });
  });
}
