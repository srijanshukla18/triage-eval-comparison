export const CATEGORIES = [
  "order_status",
  "refund_request",
  "shipping_delay",
  "account_access",
  "product_question",
  "billing_dispute",
  "cancellation",
  "complaint",
  "policy_question",
  "multi_intent"
] as const;

export type Category = (typeof CATEGORIES)[number];

export const EXTERNAL_TOOL_NAMES = ["lookup_order", "lookup_shipping"] as const;
export const TOOL_NAMES = [...EXTERNAL_TOOL_NAMES, "retrieve_policy"] as const;

export type ExternalToolName = (typeof EXTERNAL_TOOL_NAMES)[number];
export type ToolName = (typeof TOOL_NAMES)[number];

export type OrderStatus =
  | "processing"
  | "shipped"
  | "shipped_ambiguous"
  | "delivered"
  | "cancelled"
  | "refunded"
  | "not_found";

export type OrderData = {
  orderId: string;
  status: OrderStatus;
  item: string;
  customerName: string;
  orderDate: string;
  estimatedDelivery?: string;
  deliveredAt?: string;
  carrierId?: string;
  refundEligible: boolean;
  notes: string[];
};

export type ShippingData = {
  carrierId: string;
  carrier: string;
  status: "in_transit" | "delayed" | "delivered" | "label_created" | "unknown";
  lastScan: string;
  eta?: string;
  notes: string[];
};

export type PolicySnippet = {
  id: string;
  title: string;
  text: string;
  categories: Category[];
};

export type ToolCallRecord = {
  name: ExternalToolName;
  args: Record<string, unknown>;
  result: unknown;
};

export type AgentResult = {
  reply: string;
  category: Category;
  orderId?: string;
  orderData?: OrderData | null;
  shippingData?: ShippingData | null;
  retrievedPolicy?: PolicySnippet | null;
  toolCalls: ToolCallRecord[];
};

export type Classification = {
  category: Category;
  orderId?: string;
};

export type AgentModel = {
  classify(args: {
    input: string;
    systemPrompt: string;
    callbacks?: unknown[];
  }): Promise<Classification>;
  shouldLookupShipping(args: {
    input: string;
    category: Category;
    orderData: OrderData;
    callbacks?: unknown[];
  }): Promise<boolean>;
  draftReply(args: {
    input: string;
    systemPrompt: string;
    category: Category;
    orderData?: OrderData | null;
    shippingData?: ShippingData | null;
    retrievedPolicy?: PolicySnippet | null;
    callbacks?: unknown[];
  }): Promise<string>;
};

export type RunOptions = {
  model?: AgentModel;
  callbacks?: unknown[];
};
