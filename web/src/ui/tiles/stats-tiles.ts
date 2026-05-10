import type { AppState } from "../../state";
import { overallSummary } from "../../stats";

export function updateStatsTiles(state: AppState): void {
  if (!state.tab) return;
  const ov = overallSummary(state.tab);

  setValue("stat-height", `${state.tab.height.toFixed(1)} m`);
  setValue("stat-sectors", String(state.tab.nSectors));
  setValue("stat-meanspeed", `${ov.meanSpeedMs.toFixed(2)} m/s`);
  setValue("stat-weibull", `${ov.weibullA.toFixed(2)} / ${ov.weibullK.toFixed(2)}`);
}

function setValue(id: string, text: string): void {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}
