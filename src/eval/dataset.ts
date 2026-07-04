import type { Category, ToolName } from "../agent/types.js";

export type Ticket = {
  id: string;
  input: string;
  expected_category: Category;
  expected_tools: ToolName[];
  gold_notes: string;
};

export const TICKETS: Ticket[] = [
  {
    id: "happy-order-status",
    input: "Hi, can you tell me where order A1001 is?",
    expected_category: "order_status",
    expected_tools: ["lookup_order"],
    gold_notes: "Should state the order was delivered and avoid offering refunds unless asked."
  },
  {
    id: "missing-order-id",
    input: "Where is my package? I never got a tracking email.",
    expected_category: "order_status",
    expected_tools: [],
    gold_notes: "Should ask for the order number before discussing account-specific status."
  },
  {
    id: "multi-intent-shipping-refund",
    input: "Two things: where is B2042, and can I get a refund if it is still late?",
    expected_category: "multi_intent",
    expected_tools: ["lookup_order", "lookup_shipping"],
    gold_notes: "Should handle both status and refund eligibility without promising an automatic refund."
  },
  {
    id: "refund-denial",
    input: "I want a refund for D4040. I burned the candle already but changed my mind.",
    expected_category: "refund_request",
    expected_tools: ["lookup_order"],
    gold_notes: "Must not say the customer is owed a refund; final-sale consumable refund is not eligible unless defective."
  },
  {
    id: "impossible-policy-request",
    input: "What is your platinum lifetime upgrade policy? I saw it mentioned somewhere but cannot find it.",
    expected_category: "policy_question",
    expected_tools: [],
    gold_notes: "Must not invent a platinum lifetime upgrade policy; should escalate or say no retrieved policy covers it."
  },
  {
    id: "hostile-late-order",
    input: "This is ridiculous. B2042 is late and your tracking is useless. Fix it now.",
    expected_category: "shipping_delay",
    expected_tools: ["lookup_order", "lookup_shipping"],
    gold_notes: "Should stay calm, use order and shipping data, and not guarantee a replacement before investigation."
  },
  {
    id: "non-native-english",
    input: "helo my order C3003 no come yet what happen pls",
    expected_category: "order_status",
    expected_tools: ["lookup_order"],
    gold_notes: "Should understand non-native phrasing and explain the order is still processing."
  },
  {
    id: "ambiguous-shipped-late",
    input: "B2042 says shipped but it was supposed to arrive days ago. Is it actually moving?",
    expected_category: "shipping_delay",
    expected_tools: ["lookup_order", "lookup_shipping"],
    gold_notes: "Should call shipping lookup after order lookup and cite carrier delay evidence."
  },
  {
    id: "password-reset",
    input: "I forgot my password and cannot get into my account.",
    expected_category: "account_access",
    expected_tools: [],
    gold_notes: "Should recommend password reset or verification; must not ask for the password."
  },
  {
    id: "product-material",
    input: "What material is the linen shirt made of, and does it shrink?",
    expected_category: "product_question",
    expected_tools: [],
    gold_notes: "Should only answer from available product or policy data and escalate unknown product specifics."
  },
  {
    id: "billing-refund-confusion",
    input: "My card was charged twice for F6060 even though support said it was refunded.",
    expected_category: "billing_dispute",
    expected_tools: ["lookup_order"],
    gold_notes: "Should mention the fixture says refund issued and route the billing dispute without asking for full card details."
  },
  {
    id: "cancel-known-order",
    input: "Please cancel E5050 if it has not shipped yet.",
    expected_category: "cancellation",
    expected_tools: ["lookup_order"],
    gold_notes: "Should say the order was already cancelled before fulfillment."
  },
  {
    id: "generic-complaint",
    input: "Your support experience has been awful and nobody replies to me.",
    expected_category: "complaint",
    expected_tools: [],
    gold_notes: "Should acknowledge the complaint and offer escalation without fabricating order facts."
  },
  {
    id: "return-policy",
    input: "What is the refund window after delivery?",
    expected_category: "policy_question",
    expected_tools: [],
    gold_notes: "Should state standard refunds are available within 30 days of delivery for unused items."
  },
  {
    id: "unknown-order",
    input: "Can you check order Z9999? The confirmation page disappeared.",
    expected_category: "order_status",
    expected_tools: ["lookup_order"],
    gold_notes: "Should say no order fixture was found and ask for verification or escalation."
  },
  {
    id: "in-window-shipping",
    input: "G7070 tracking looks weird. Is my bowl late?",
    expected_category: "shipping_delay",
    expected_tools: ["lookup_order", "lookup_shipping"],
    gold_notes: "Should explain the package is still inside the delivery window if shipping data is checked."
  },
  {
    id: "eligible-refund",
    input: "A1001 arrived but I do not need the mug anymore. Can I return it?",
    expected_category: "refund_request",
    expected_tools: ["lookup_order"],
    gold_notes: "Should say standard refund may be available if unused and within 30 days of delivery."
  },
  {
    id: "account-verification",
    input: "I changed phones and my login code goes nowhere. Can you disable verification?",
    expected_category: "account_access",
    expected_tools: [],
    gold_notes: "Should not bypass verification; should escalate identity-sensitive account access."
  },
  {
    id: "warranty-question",
    input: "Does the ceramic bowl have a two-year chip warranty?",
    expected_category: "product_question",
    expected_tools: [],
    gold_notes: "Should not invent a warranty; should use available policy or escalate unknown details."
  },
  {
    id: "cancel-no-order",
    input: "I need to cancel but I cannot find the order number.",
    expected_category: "cancellation",
    expected_tools: [],
    gold_notes: "Should ask for order number before taking account-specific cancellation action."
  },
  {
    id: "billing-no-order",
    input: "You charged me shipping even though the promo said free shipping.",
    expected_category: "billing_dispute",
    expected_tools: [],
    gold_notes: "Should handle as billing dispute and avoid claiming account-specific facts without an order id."
  },
  {
    id: "multi-intent-order-account",
    input: "Where is G7070, and can you change the email on my account?",
    expected_category: "multi_intent",
    expected_tools: ["lookup_order", "lookup_shipping"],
    gold_notes: "Should answer order status from tools and escalate or route account email change separately."
  },
  {
    id: "angry-without-order",
    input: "I am furious. You people lost my stuff and I want someone senior.",
    expected_category: "complaint",
    expected_tools: [],
    gold_notes: "Should acknowledge frustration and offer escalation without inventing shipment details."
  },
  {
    id: "invented-birthday-refund",
    input: "Is there a birthday refund exception policy that lets me return anything?",
    expected_category: "policy_question",
    expected_tools: [],
    gold_notes: "Must not invent a birthday refund exception policy; should use retrieved refund policy or escalate."
  },
  {
    id: "refund-non-native",
    input: "Order E5050 cancel already but money when back? I need know.",
    expected_category: "refund_request",
    expected_tools: ["lookup_order"],
    gold_notes: "Should understand the refund question and explain only what the order fixture supports."
  }
];

export function getTicketById(id: string): Ticket {
  const ticket = TICKETS.find((candidate) => candidate.id === id);
  if (!ticket) {
    throw new Error(`Unknown ticket id: ${id}`);
  }
  return ticket;
}
