import { describe, expect, it } from "vitest";
import type { AgentResult } from "../src/agent/types.js";
import { TICKETS } from "../src/eval/dataset.js";
import { categoryMatch, parseJudgeResponse, toolCorrect } from "../src/eval/scorers.js";
import { requiredEnv } from "../src/platforms/common.js";

const ticket = TICKETS.find((row) => row.id === "ambiguous-shipped-late");

if (!ticket) {
  throw new Error("ambiguous-shipped-late fixture missing");
}

const matchingOutput: AgentResult = {
  category: ticket.expected_category,
  toolCalls: [
    { name: "lookup_order", args: { orderId: "B2042" }, result: { orderId: "B2042" } },
    { name: "lookup_shipping", args: { carrierId: "CARR-77" }, result: { carrierId: "CARR-77" } }
  ],
  retrievedPolicy: null,
  reply: "Order B2042 is shipped_ambiguous. Carrier tracking is delayed."
};

describe("neutral scorers", () => {
  it("scores category matches and mismatches", () => {
    expect(categoryMatch(ticket, matchingOutput).score).toBe(1);
    expect(categoryMatch(ticket, { ...matchingOutput, category: "refund_request" }).score).toBe(0);
  });

  it("scores the full expected tool sequence", () => {
    expect(toolCorrect(ticket, matchingOutput).score).toBe(1);
    expect(toolCorrect(ticket, { ...matchingOutput, toolCalls: [] }).score).toBe(0);
    expect(
      toolCorrect(ticket, { ...matchingOutput, toolCalls: matchingOutput.toolCalls.slice(0, 1) }).score
    ).toBe(0);
  });

  it("parses judge JSON despite surrounding text", () => {
    expect(parseJudgeResponse('Result: {"score":0.75,"comment":"usable"}')).toEqual({
      score: 0.75,
      comment: "usable"
    });
  });

  it("fails missing credential checks without printing secret values", () => {
    const previous = process.env.TEST_SECRET;
    process.env.TEST_SECRET = "";
    expect(() => requiredEnv(["TEST_SECRET"])).toThrow("Missing required environment variables: TEST_SECRET");
    process.env.TEST_SECRET = previous;
  });
});
