import type { AnalysisResult } from "./types";

const KEY = "hygeia.results.v1";
const MAX = 20;

/** Results live in this browser only (no account, no server-side history). */
export function saveResult(r: AnalysisResult) {
  try {
    const all = loadAll().filter((x) => x.result_id !== r.result_id);
    all.unshift(r);
    localStorage.setItem(KEY, JSON.stringify(all.slice(0, MAX)));
  } catch { /* storage full or disabled */ }
}

export function loadAll(): AnalysisResult[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; }
}

export function loadOne(id: string): AnalysisResult | undefined {
  return loadAll().find((x) => x.result_id === id);
}

export function removeResult(id: string) {
  try { localStorage.setItem(KEY, JSON.stringify(loadAll().filter((x) => x.result_id !== id))); } catch { /* ignore */ }
}

export function clearAll() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
