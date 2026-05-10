import "./style.css";
import { subscribe, getState } from "./state";
import { initDropzone } from "./ui/dropzone";
import { initRoseTile } from "./ui/tiles/rose-tile";
import { initSectorTile } from "./ui/tiles/sector-tile";
import { initDownloadTile } from "./ui/tiles/download-tile";
import { updateBento } from "./ui/bento";

// Expose state on window so download buttons can read it without extra wiring
(window as unknown as Record<string, unknown>).__state = getState();
subscribe((s) => {
  (window as unknown as Record<string, unknown>).__state = s;
});

initDropzone(document.getElementById("app")!);
initRoseTile();
initSectorTile();
initDownloadTile();

subscribe((state) => {
  updateBento(state);
});

// Initial render (empty state)
updateBento(getState());
