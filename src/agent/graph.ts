import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { retrievePolicy } from "./kb.js";
import { createRuleBasedModel, needsOrderLookup, OpenRouterAgentModel } from "./model.js";
import { lookupOrder, lookupShipping } from "./tools.js";
import type {
  AgentModel,
  AgentResult,
  Category,
  OrderData,
  PolicySnippet,
  RunOptions,
  ShippingData,
  ToolCallRecord
} from "./types.js";

const AgentState = Annotation.Root({
  input: Annotation<string>(),
  systemPrompt: Annotation<string>(),
  category: Annotation<Category | undefined>(),
  orderId: Annotation<string | undefined>(),
  orderData: Annotation<OrderData | null | undefined>(),
  shippingData: Annotation<ShippingData | null | undefined>(),
  retrievedPolicy: Annotation<PolicySnippet | null | undefined>(),
  shouldLookupShipping: Annotation<boolean | undefined>(),
  reply: Annotation<string | undefined>(),
  toolCalls: Annotation<ToolCallRecord[]>({
    reducer: (left, right) => left.concat(right),
    default: () => []
  })
});

type AgentStateValue = typeof AgentState.State;

function getModel(options?: RunOptions): AgentModel {
  return options?.model ?? new OpenRouterAgentModel();
}

function callbackArgs(options?: RunOptions): { callbacks?: unknown[] } {
  return options?.callbacks ? { callbacks: options.callbacks } : {};
}

function routeAfterClassify(state: AgentStateValue): "lookup_order" | "retrieve_policy" {
  return state.category && state.orderId && needsOrderLookup(state.category) ? "lookup_order" : "retrieve_policy";
}

function routeAfterShippingDecision(state: AgentStateValue): "lookup_shipping" | "retrieve_policy" {
  return state.shouldLookupShipping && state.orderData?.carrierId ? "lookup_shipping" : "retrieve_policy";
}

export function buildAgentGraph(options?: RunOptions) {
  const model = getModel(options);

  return new StateGraph(AgentState)
    .addNode("classify", async (state: AgentStateValue) => {
      const result = await model.classify({
        input: state.input,
        systemPrompt: state.systemPrompt,
        ...callbackArgs(options)
      });
      return result;
    })
    .addNode("lookup_order", (state: AgentStateValue) => {
      if (!state.orderId) {
        return { orderData: null };
      }
      const orderData = lookupOrder(state.orderId);
      return {
        orderData,
        toolCalls: [
          {
            name: "lookup_order",
            args: { orderId: state.orderId },
            result: orderData
          } satisfies ToolCallRecord
        ]
      };
    })
    .addNode("decide_shipping", async (state: AgentStateValue) => {
      if (!state.category || !state.orderData || state.orderData.status === "not_found") {
        return { shouldLookupShipping: false };
      }
      const shouldLookupShipping = await model.shouldLookupShipping({
        input: state.input,
        category: state.category,
        orderData: state.orderData,
        ...callbackArgs(options)
      });
      return { shouldLookupShipping };
    })
    .addNode("lookup_shipping", (state: AgentStateValue) => {
      const carrierId = state.orderData?.carrierId;
      if (!carrierId) {
        return { shippingData: null };
      }
      const shippingData = lookupShipping(carrierId);
      return {
        shippingData,
        toolCalls: [
          {
            name: "lookup_shipping",
            args: { carrierId },
            result: shippingData
          } satisfies ToolCallRecord
        ]
      };
    })
    .addNode("retrieve_policy", (state: AgentStateValue) => ({
      retrievedPolicy: state.category ? retrievePolicy(state.category) : null
    }))
    .addNode("draft", async (state: AgentStateValue) => {
      if (!state.category) {
        throw new Error("Cannot draft reply before classification.");
      }
      const reply = await model.draftReply({
        input: state.input,
        systemPrompt: state.systemPrompt,
        category: state.category,
        orderData: state.orderData ?? null,
        shippingData: state.shippingData ?? null,
        retrievedPolicy: state.retrievedPolicy ?? null,
        ...callbackArgs(options)
      });
      return { reply };
    })
    .addEdge(START, "classify")
    .addConditionalEdges("classify", routeAfterClassify)
    .addEdge("lookup_order", "decide_shipping")
    .addConditionalEdges("decide_shipping", routeAfterShippingDecision)
    .addEdge("lookup_shipping", "retrieve_policy")
    .addEdge("retrieve_policy", "draft")
    .addEdge("draft", END)
    .compile();
}

export async function runAgent(input: string, systemPrompt: string, options?: RunOptions): Promise<AgentResult> {
  const graph = buildAgentGraph(options);
  const finalState = await graph.invoke({
    input,
    systemPrompt,
    toolCalls: []
  });

  if (!finalState.category || !finalState.reply) {
    throw new Error("Agent graph completed without category or reply.");
  }

  return {
    reply: finalState.reply,
    category: finalState.category,
    ...(finalState.orderId ? { orderId: finalState.orderId } : {}),
    orderData: finalState.orderData ?? null,
    shippingData: finalState.shippingData ?? null,
    retrievedPolicy: finalState.retrievedPolicy ?? null,
    toolCalls: finalState.toolCalls ?? []
  };
}

export { createRuleBasedModel };
