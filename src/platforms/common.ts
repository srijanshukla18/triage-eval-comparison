import { createHash } from "node:crypto";
import { TICKETS, type Ticket } from "../eval/dataset.js";
import type { AgentResult } from "../agent/types.js";
import type { ScoreResult } from "../eval/scorers.js";

export const PROJECT_NAME = "triage-comparison";
export const DATASET_NAME = "triage-comparison-v2";

export type EvalInput = {
  id: string;
  input: string;
};

export type EvalExpected = Ticket;

export function datasetHash(): string {
  return createHash("sha256").update(JSON.stringify(TICKETS)).digest("hex").slice(0, 12);
}

export function toEvalInput(ticket: Ticket): EvalInput {
  return { id: ticket.id, input: ticket.input };
}

export function requiredEnv(names: string[]): void {
  const missing = names.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}

export function stableUuid(namespace: string, value: string): string {
  const hash = createHash("sha256").update(`${namespace}:${value}`).digest();
  const bytes = Uint8Array.from(hash.subarray(0, 16));
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x50;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function scoreToBraintrust(score: ScoreResult): { name: string; score: number; metadata?: Record<string, unknown> } {
  return {
    name: score.name,
    score: score.score,
    ...(score.comment ? { metadata: { comment: score.comment } } : {})
  };
}

export function scoreToLangSmith(score: ScoreResult): { key: string; score: number; comment?: string } {
  return {
    key: score.name,
    score: score.score,
    ...(score.comment ? { comment: score.comment } : {})
  };
}

export function scoreToLangfuse(score: ScoreResult): {
  name: string;
  value: number;
  comment?: string;
  dataType: "NUMERIC";
} {
  return {
    name: score.name,
    value: score.score,
    ...(score.comment ? { comment: score.comment } : {}),
    dataType: "NUMERIC"
  };
}

export function summarizeLocalScores(results: Array<{ ticket: Ticket; output: AgentResult; scores: ScoreResult[] }>) {
  const totals = new Map<string, { total: number; count: number }>();
  for (const row of results) {
    for (const score of row.scores) {
      const current = totals.get(score.name) ?? { total: 0, count: 0 };
      current.total += score.score;
      current.count += 1;
      totals.set(score.name, current);
    }
  }
  return Object.fromEntries(
    [...totals.entries()].map(([name, value]) => [name, Number((value.total / value.count).toFixed(4))])
  );
}
