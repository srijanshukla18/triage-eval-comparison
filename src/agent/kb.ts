import type { Category, PolicySnippet } from "./types.js";

export const POLICIES: PolicySnippet[] = [
  {
    id: "order-status",
    title: "Order status updates",
    categories: ["order_status", "shipping_delay"],
    text: "Agents may share order status, carrier name, last carrier scan, and estimated delivery when an order record is found. If an order number is missing, ask for it before discussing account-specific status."
  },
  {
    id: "refund-window",
    title: "Refund eligibility",
    categories: ["refund_request", "billing_dispute"],
    text: "Standard refunds are available within 30 days of delivery for unused items. Shipping fees are not refundable unless the company made the error. Delivered consumables and final-sale items are not eligible unless defective."
  },
  {
    id: "shipping-delay",
    title: "Shipping delay handling",
    categories: ["shipping_delay", "complaint"],
    text: "If tracking shows no movement for 72 hours after the expected delivery date, agents may apologize, share the latest scan, and escalate to carrier investigation. Do not guarantee a replacement before investigation."
  },
  {
    id: "account-access",
    title: "Account access",
    categories: ["account_access"],
    text: "For sign-in issues, agents may recommend password reset and email verification. Agents must not ask for passwords or full payment card numbers. Identity-sensitive cases should be escalated."
  },
  {
    id: "cancellation",
    title: "Cancellation policy",
    categories: ["cancellation"],
    text: "Orders can be cancelled before fulfillment. Once shipped, cancellation is no longer available and the customer should follow the return workflow after delivery if eligible."
  },
  {
    id: "product-info",
    title: "Product questions",
    categories: ["product_question", "policy_question"],
    text: "Agents may answer product-material, sizing, and warranty questions only from known catalog or policy data. If a requested policy or product fact is not available, escalate instead of guessing."
  }
];

export function retrievePolicy(category: Category): PolicySnippet | null {
  return POLICIES.find((policy) => policy.categories.includes(category)) ?? null;
}
