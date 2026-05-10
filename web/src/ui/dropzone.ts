import { parseTab } from "../parse";
import { setTab, setError } from "../state";

export function initDropzone(root: HTMLElement): void {
  // Whole-page drag overlay
  const overlay = document.getElementById("drop-overlay")!;

  let dragDepth = 0;

  document.addEventListener("dragenter", (e) => {
    e.preventDefault();
    dragDepth++;
    overlay.classList.add("visible");
  });

  document.addEventListener("dragleave", () => {
    dragDepth--;
    if (dragDepth <= 0) {
      dragDepth = 0;
      overlay.classList.remove("visible");
    }
  });

  document.addEventListener("dragover", (e) => {
    e.preventDefault();
  });

  document.addEventListener("drop", (e) => {
    e.preventDefault();
    dragDepth = 0;
    overlay.classList.remove("visible");
    const file = e.dataTransfer?.files[0];
    if (file) loadFile(file);
  });

  // File input fallback (click "load file" button)
  const input = document.getElementById("file-input") as HTMLInputElement;
  input?.addEventListener("change", () => {
    const file = input.files?.[0];
    if (file) loadFile(file);
    input.value = "";
  });

  // "Try sample" link
  const sampleBtn = document.getElementById("sample-btn");
  sampleBtn?.addEventListener("click", async () => {
    try {
      const res = await fetch("example.tab");
      if (!res.ok) throw new Error("Sample file not found");
      const text = await res.text();
      const tab = parseTab(text);
      setTab(tab, "example.tab");
    } catch (err) {
      setError(String(err));
    }
  });

  // Drop onto hero area
  root.addEventListener("drop", (e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files[0];
    if (file) loadFile(file);
  });
  root.addEventListener("dragover", (e) => e.preventDefault());
}

function loadFile(file: File): void {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const text = reader.result as string;
      const tab = parseTab(text);
      setTab(tab, file.name);
    } catch (err) {
      setError(String(err));
    }
  };
  reader.readAsText(file, "utf-8");
}
