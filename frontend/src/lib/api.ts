import type { AnalysisResult, AnalyzeOptions, HealthInfo, Questionnaire, StageEvent } from "./types";

const BASE = import.meta.env.VITE_API_BASE ?? "";

export async function getHealth(): Promise<HealthInfo> {
  const r = await fetch(`${BASE}/api/health`);
  if (!r.ok) throw new Error(`health ${r.status}`);
  return r.json();
}

export async function getModels(): Promise<{ card: any; runtime: HealthInfo }> {
  const r = await fetch(`${BASE}/api/models`);
  if (!r.ok) throw new Error(`models ${r.status}`);
  return r.json();
}

export async function getResult(id: string): Promise<AnalysisResult> {
  const r = await fetch(`${BASE}/api/results/${id}`);
  if (!r.ok) throw new Error(r.status === 404 ? "This result has expired on the server." : `result ${r.status}`);
  return r.json();
}

export async function chat(result_id: string, message: string): Promise<{ reply: string; history: { role: string; text: string }[] }> {
  const r = await fetch(`${BASE}/api/chat`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ result_id, message }),
  });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(e.detail ?? `chat ${r.status}`);
  }
  return r.json();
}

/** Streams per-stage events over SSE and resolves with the final payload. */
export async function analyzeStream(
  file: File, questionnaire: Questionnaire, options: AnalyzeOptions,
  onStage: (ev: StageEvent) => void, signal?: AbortSignal,
): Promise<AnalysisResult> {
  const fd = new FormData();
  fd.append("image", file);
  fd.append("questionnaire", JSON.stringify(questionnaire));
  fd.append("options", JSON.stringify(options));
  const r = await fetch(`${BASE}/api/analyze/stream`, { method: "POST", body: fd, signal });
  if (!r.ok || !r.body) {
    const e = await r.json().catch(() => ({}));
    throw new Error(e.detail ?? `analyze ${r.status}`);
  }
  const reader = r.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let result: AnalysisResult | null = null;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let idx: number;
    while ((idx = buf.indexOf("\n\n")) >= 0) {
      const chunk = buf.slice(0, idx); buf = buf.slice(idx + 2);
      const line = chunk.split("\n").find((l) => l.startsWith("data: "));
      if (!line) continue;
      const ev = JSON.parse(line.slice(6));
      if (ev.type === "stage") onStage(ev as StageEvent);
      else if (ev.type === "result") result = ev.data as AnalysisResult;
      else if (ev.type === "error") throw new Error(ev.message);
    }
  }
  if (!result) throw new Error("The analysis ended without a result.");
  return result;
}

export interface Precheck { is_relevant: boolean; p_relevant: number; threshold: number; warnings: string[]; latency_ms: number; seen?: string }

/** Relevance gate only: is this an analysable skin photo? Runs before the questionnaire. */
export async function precheck(file: File, signal?: AbortSignal): Promise<Precheck> {
  const fd = new FormData();
  fd.append("image", file);
  const r = await fetch(`${BASE}/api/precheck`, { method: "POST", body: fd, signal });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(e.detail ?? `precheck ${r.status}`);
  }
  return r.json();
}

/** Questionnaire-only check for the "nothing visible" path. Returns the same result shape with status "symptoms_only". */
export async function triageOnly(questionnaire: Questionnaire, signal?: AbortSignal): Promise<AnalysisResult> {
  const r = await fetch(`${BASE}/api/triage`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ questionnaire }), signal,
  });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(e.detail ?? `triage ${r.status}`);
  }
  return r.json();
}
