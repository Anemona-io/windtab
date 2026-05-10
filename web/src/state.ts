import type { TabFile } from "./parse";

export interface AppState {
  tab: TabFile | null;
  filename: string;
  selectedSector: number | null;
  energyWeighted: boolean;
  error: string | null;
}

type Listener = (state: AppState) => void;

const state: AppState = {
  tab: null,
  filename: "",
  selectedSector: null,
  energyWeighted: false,
  error: null,
};

const listeners: Set<Listener> = new Set();

export function getState(): Readonly<AppState> {
  return state;
}

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify(): void {
  listeners.forEach((fn) => fn(state));
}

export function setTab(tab: TabFile, filename: string): void {
  state.tab = tab;
  state.filename = filename;
  state.selectedSector = null;
  state.error = null;
  notify();
}

export function setError(msg: string): void {
  state.error = msg;
  state.tab = null;
  notify();
}

export function setSelectedSector(i: number | null): void {
  state.selectedSector = i;
  notify();
}

export function setEnergyWeighted(v: boolean): void {
  state.energyWeighted = v;
  notify();
}
