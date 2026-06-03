import { ChatOpenRouter } from "@langchain/openrouter";
import { z } from "zod";
import { CATEGORIES, type AgentModel, type Category, type OrderData } from "./types.js";

const classificationSchema = z.object({
  category: z.enum(CATEGORIES),
  orderId: z.string().nullable()
});

const shippingDecisionSchema = z.object({
  shouldLookupShipping: z.boolean(),
  reason: z.string()
});

function optionalOrderId(orderId: string | null | undefined): { orderId?: string } {
  const cleaned = orderId?.trim().toUpperCase();
  return cleaned ? { orderId: cleaned } : {};
}

function messageContentToString(message: unknown): string {
  const content = (message as { content?: unknown }).content;
  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part) {
          return String((part as { text: unknown }).text);
        }
        return "";
      })
      .join("");
  }
  return String(content ?? "");
}

function parseJsonObject(raw: string): unknown {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced ?? trimmed.slice(trimmed.indexOf("{"), trimmed.lastIndexOf("}") + 1);
  if (!candidate || !candidate.startsWith("{")) {
    throw new Error(`Expected JSON object response, got: ${trimmed.slice(0, 200)}`);
  }
  return JSON.parse(candidate);
}

export function extractOrderId(input: string): string | undefined {
  return input.match(/\b[A-Z]\d{4}\b/i)?.[0]?.toUpperCase();
}

export function needsOrderLookup(category: Category): boolean {
  return [
    "order_status",
    "refund_request",
    "shipping_delay",
    "billing_dispute",
    "cancellation",
    "multi_intent"
  ].includes(category);
}

export class OpenRouterAgentModel implements AgentModel {
  private readonly model: ChatOpenRouter;

  constructor(modelName = process.env.TRIAGE_MODEL ?? "openai/gpt-oss-120b:free") {
    this.model = new ChatOpenRouter({
      model: modelName,
      temperature: 0,
      maxTokens: 900,
      siteUrl: process.env.OPENROUTER_SITE_URL ?? "https://github.com/srijanshukla18/triage-eval-comparison",
      siteName: process.env.OPENROUTER_APP_TITLE ?? "triage-eval-comparison"
    });
  }

  async classify(args: Parameters<AgentModel["classify"]>[0]) {
    const response = await this.model.invoke(
      [
        {
          role: "system",
          content: `${args.systemPrompt}\n\nReturn only valid JSON. Do not use markdown.`
        },
        {
          role: "user",
          content: `Classify this support ticket into exactly one fixed category. Extract the order id only if present.

Allowed categories:
${CATEGORIES.join(", ")}

JSON shape:
{"category":"order_status","orderId":"A1001"}

Use null for orderId when absent.

Ticket:
${args.input}`
        }
      ],
      { callbacks: args.callbacks as never }
    );
    const result = classificationSchema.parse(parseJsonObject(messageContentToString(response)));
    return {
      category: result.category,
      ...optionalOrderId(result.orderId ?? extractOrderId(args.input))
    };
  }

  async shouldLookupShipping(args: Parameters<AgentModel["shouldLookupShipping"]>[0]) {
    const response = await this.model.invoke(
      [
        {
          role: "system",
          content:
            'Decide whether the support agent must call lookup_shipping before answering. Return only valid JSON like {"shouldLookupShipping":true,"reason":"needs carrier delay evidence"}. Return true only when the order is shipped or shipped_ambiguous and the ticket needs carrier details, delay evidence, or ETA clarification.'
        },
        {
          role: "user",
          content: JSON.stringify({
            ticket: args.input,
            category: args.category,
            orderData: args.orderData
          })
        }
      ],
      { callbacks: args.callbacks as never }
    );
    const result = shippingDecisionSchema.parse(parseJsonObject(messageContentToString(response)));
    return result.shouldLookupShipping;
  }

  async draftReply(args: Parameters<AgentModel["draftReply"]>[0]) {
    const response = await this.model.invoke(
      [
        { role: "system", content: args.systemPrompt },
        {
          role: "user",
          content: `Draft the final customer-facing reply. Use only the provided ticket, category, tool data, and retrieved policy. If there is no policy support for a requested claim, say the case should be escalated.\n\n${JSON.stringify(
            {
              ticket: args.input,
              category: args.category,
              orderData: args.orderData ?? null,
              shippingData: args.shippingData ?? null,
              retrievedPolicy: args.retrievedPolicy ?? null
            },
            null,
            2
          )}`
        }
      ],
      { callbacks: args.callbacks as never }
    );
    return messageContentToString(response).trim();
  }
}

export function createRuleBasedModel(): AgentModel {
  return {
    async classify({ input }) {
      const lower = input.toLowerCase();
      const orderId = extractOrderId(input);
      let category: Category = "complaint";

      if ((lower.includes("refund") || lower.includes("money back")) && lower.includes("billing")) {
        category = "billing_dispute";
      } else if (lower.includes("refund") || lower.includes("return")) {
        category = "refund_request";
      } else if (lower.includes("cancel")) {
        category = "cancellation";
      } else if (lower.includes("password") || lower.includes("login") || lower.includes("account")) {
        category = "account_access";
      } else if (lower.includes("policy") || lower.includes("warranty") || lower.includes("guarantee")) {
        category = "policy_question";
      } else if (lower.includes("size") || lower.includes("material") || lower.includes("product")) {
        category = "product_question";
      } else if (
        lower.includes("late") ||
        lower.includes("delay") ||
        lower.includes("supposed to arrive") ||
        lower.includes("shipped") ||
        lower.includes("tracking") ||
        lower.includes("where") ||
        lower.includes("order")
      ) {
        category =
          lower.includes("refund") || lower.includes("two things")
            ? "multi_intent"
            : lower.includes("late") ||
                lower.includes("delay") ||
                lower.includes("supposed to arrive") ||
                lower.includes("shipped")
              ? "shipping_delay"
              : "order_status";
      }

      if ((lower.includes("where") || lower.includes("tracking")) && (lower.includes("refund") || lower.includes("cancel"))) {
        category = "multi_intent";
      }

      return { category, ...optionalOrderId(orderId) };
    },
    async shouldLookupShipping({ input, orderData }) {
      const lower = input.toLowerCase();
      return (
        Boolean(orderData.carrierId) &&
        ["shipped", "shipped_ambiguous"].includes(orderData.status) &&
        (lower.includes("late") ||
          lower.includes("delay") ||
          lower.includes("stuck") ||
          lower.includes("where") ||
          lower.includes("supposed to arrive") ||
          lower.includes("shipped"))
      );
    },
    async draftReply({ input, category, orderData, shippingData, retrievedPolicy }) {
      const policyText = retrievedPolicy ? `Policy: ${retrievedPolicy.text}` : "No matching policy was retrieved.";
      const orderText = orderData
        ? `Order ${orderData.orderId} is ${orderData.status}. ${orderData.notes.join(" ")}`
        : "No order-specific data is available.";
      const shippingText = shippingData
        ? ` Carrier ${shippingData.carrier} reports ${shippingData.status}; last scan: ${shippingData.lastScan}.`
        : "";
      return [
        `I reviewed this as ${category}.`,
        orderText + shippingText,
        policyText,
        input.toLowerCase().includes("not exist")
          ? "I do not have a retrieved policy covering that request, so I will escalate instead of inventing one."
          : "I can help with the next step using the information above."
      ].join(" ");
    }
  };
}
