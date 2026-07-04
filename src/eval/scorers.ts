import { ChatOpenRouter } from "@langchain/openrouter";
import { z } from "zod";
import type { AgentResult } from "../agent/types.js";
import type { Ticket } from "./dataset.js";

export type ScoreResult = {
  name: "categoryMatch" | "toolCorrect" | "replyQuality" | "faithfulness";
  score: number;
  comment?: string;
};

export type JudgeScore = {
  score: number;
  comment: string;
};

export type JudgeModel = {
  judge(prompt: string): Promise<JudgeScore>;
};

const judgeSchema = z.object({
  score: z.number().min(0).max(1),
  comment: z.string()
});

export function parseJudgeResponse(raw: unknown): JudgeScore {
  const rawString = typeof raw === "string" ? raw.trim() : null;
  const fenced = rawString?.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate =
    typeof raw === "string"
      ? JSON.parse(fenced ?? raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1))
      : raw;
  const parsed = judgeSchema.parse(candidate);
  return {
    score: parsed.score,
    comment: parsed.comment
  };
}

export class OpenRouterJudgeModel implements JudgeModel {
  private readonly model: ChatOpenRouter;

  constructor(modelName = process.env.JUDGE_MODEL ?? "nvidia/nemotron-3-ultra-550b-a55b:free") {
    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY is required for LLM-as-judge scorers.");
    }
    this.model = new ChatOpenRouter({
      model: modelName,
      temperature: 0,
      // Reasoning models spend completion tokens on reasoning before emitting
      // the JSON verdict; a tight cap truncates the verdict to empty content.
      maxTokens: 2000,
      siteUrl: process.env.OPENROUTER_SITE_URL ?? "https://github.com/srijanshukla18/triage-eval-comparison",
      siteName: process.env.OPENROUTER_APP_TITLE ?? "triage-eval-comparison"
    });
  }

  async judge(prompt: string): Promise<JudgeScore> {
    // Free OpenRouter endpoints intermittently 504 or return truncated bodies;
    // without retries one transient failure voids an entire eval row.
    const maxAttempts = 3;
    let lastError: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await this.model.invoke([
          {
            role: "system",
            content:
              'You are an exacting evaluator. Return only valid JSON. Do not use markdown. Shape: {"score":0.75,"comment":"short reason"}. Penalize unsupported policy claims and invented facts.'
          },
          { role: "user", content: prompt }
        ]);
        return parseJudgeResponse((result as { content?: unknown }).content);
      } catch (error) {
        lastError = error;
        if (attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, attempt * 5000));
        }
      }
    }
    throw lastError;
  }
}

export function categoryMatch(ticket: Ticket, result: AgentResult): ScoreResult {
  return {
    name: "categoryMatch",
    score: result.category === ticket.expected_category ? 1 : 0,
    comment: `expected=${ticket.expected_category}; actual=${result.category}`
  };
}

export function toolCorrect(ticket: Ticket, result: AgentResult): ScoreResult {
  const expected = ticket.expected_tools.join(" -> ") || "none";
  const actual = result.toolCalls.map((call) => call.name).join(" -> ") || "none";
  return {
    name: "toolCorrect",
    score: expected === actual ? 1 : 0,
    comment: `expected=${expected}; actual=${actual}`
  };
}

export async function replyQuality(
  ticket: Ticket,
  result: AgentResult,
  judge: JudgeModel = new OpenRouterJudgeModel()
): Promise<ScoreResult> {
  const judged = await judge.judge(`Grade the customer reply for correctness, helpfulness, and tone.

Ticket:
${ticket.input}

Gold notes:
${ticket.gold_notes}

Agent result:
${JSON.stringify(result, null, 2)}

Scoring guide:
1.0 = correct, helpful, calm, and addresses the user's request.
0.5 = partially useful but missing important nuance.
0.0 = wrong, unhelpful, rude, or contradicts the gold notes.`);

  return { name: "replyQuality", ...judged };
}

export async function faithfulness(
  ticket: Ticket,
  result: AgentResult,
  judge: JudgeModel = new OpenRouterJudgeModel()
): Promise<ScoreResult> {
  const judged = await judge.judge(`Grade whether the reply asserts only facts grounded in the retrieved policy, order data, and shipping data.

Ticket:
${ticket.input}

Retrieved policy:
${JSON.stringify(result.retrievedPolicy ?? null, null, 2)}

Order data:
${JSON.stringify(result.orderData ?? null, null, 2)}

Shipping data:
${JSON.stringify(result.shippingData ?? null, null, 2)}

Reply:
${result.reply}

Scoring guide:
1.0 = every factual or policy claim is grounded.
0.5 = mostly grounded with minor unsupported phrasing.
0.0 = invents policy, eligibility, delivery guarantees, or account facts.`);

  return { name: "faithfulness", ...judged };
}

export async function scoreAll(ticket: Ticket, result: AgentResult, judge?: JudgeModel): Promise<ScoreResult[]> {
  const deterministic = [categoryMatch(ticket, result), toolCorrect(ticket, result)];
  const subjective = [await replyQuality(ticket, result, judge), await faithfulness(ticket, result, judge)];
  return [...deterministic, ...subjective];
}
