import { runAgent, createRuleBasedModel, SYSTEM_PROMPT_V2 } from "../src/agent/index.js";

const result = await runAgent(
  "B2042 says shipped but it was supposed to arrive days ago. Is it actually moving?",
  SYSTEM_PROMPT_V2,
  { model: createRuleBasedModel() }
);

const sequence = result.toolCalls.map((call) => call.name);
if (sequence.join(",") !== "lookup_order,lookup_shipping") {
  throw new Error(`Expected lookup_order,lookup_shipping but saw ${sequence.join(",") || "none"}`);
}

console.log(
  JSON.stringify(
    {
      category: result.category,
      orderId: result.orderId,
      toolCalls: sequence,
      shippingStatus: result.shippingData?.status
    },
    null,
    2
  )
);
