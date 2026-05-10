import type { TabFile } from "./parse";
import { directions, jointProbabilities } from "./stats";

export function toCsv(tab: TabFile): string {
  const dirs = directions(tab);
  const joint = jointProbabilities(tab);
  const rows: string[] = [
    "sector,direction_deg,speed_ms,frequency_permille,joint_prob_pct",
  ];
  for (let j = 0; j < tab.nSectors; j++) {
    for (let i = 0; i < tab.speedBins.length; i++) {
      const speed = tab.speedBins[i] * tab.speedScale;
      rows.push(
        `${j},${dirs[j].toFixed(1)},${speed.toFixed(2)},${tab.frequencies[i][j].toFixed(3)},${(joint[i][j] * 100).toFixed(5)}`
      );
    }
  }
  return rows.join("\n") + "\n";
}

export function toJson(tab: TabFile): string {
  const data = {
    site_name: tab.siteName,
    x: tab.x,
    y: tab.y,
    height: tab.height,
    n_sectors: tab.nSectors,
    speed_scale: tab.speedScale,
    direction_offset: tab.directionOffset,
    directions: directions(tab),
    sector_frequencies: tab.sectorFrequencies,
    speed_bins: tab.speedBins.map((s) => s * tab.speedScale),
    frequencies: tab.frequencies,
  };
  return JSON.stringify(data, null, 2);
}

export function downloadBlob(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
