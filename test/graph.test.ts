import { describe, expect, it } from "vitest";
import { runAgent } from "../src/agent/graph.js";
import { createRuleBasedModel } from "../src/agent/model.js";
import { SYSTEM_PROMPT_V2 } from "../src/agent/prompts.js";

describe("triage graph", () => {
  it("calls order lookup and then model-decided shipping lookup for shipped-late ambiguity", async () => {
    const result = await runAgent("B2042 says shipped but it was supposed to arrive days ago.", SYSTEM_PROMPT_V2, {
      model: createRuleBasedModel()
    });

    expect(result.category).toBe("shipping_delay");
    expect(result.toolCalls.map((call) => call.name)).toEqual(["lookup_order", "lookup_shipping"]);
    expect(result.orderData?.orderId).toBe("B2042");
    expect(result.shippingData?.carrierId).toBe("CARR-77");
  });
});
