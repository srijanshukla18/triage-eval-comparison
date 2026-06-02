import { tool } from "@langchain/core/tools";
import { z } from "zod";
import type { OrderData, ShippingData } from "./types.js";

export const ORDER_FIXTURES: Record<string, OrderData> = {
  A1001: {
    orderId: "A1001",
    status: "delivered",
    item: "Trail Mug",
    customerName: "Ava",
    orderDate: "2026-05-12",
    deliveredAt: "2026-05-17",
    refundEligible: true,
    notes: ["Delivered within the standard window."]
  },
  B2042: {
    orderId: "B2042",
    status: "shipped_ambiguous",
    item: "Noise-Canceling Headphones",
    customerName: "Ben",
    orderDate: "2026-05-20",
    estimatedDelivery: "2026-05-29",
    carrierId: "CARR-77",
    refundEligible: true,
    notes: ["Order says shipped, but delivery estimate is past due."]
  },
  C3003: {
    orderId: "C3003",
    status: "processing",
    item: "Linen Shirt",
    customerName: "Cara",
    orderDate: "2026-05-31",
    estimatedDelivery: "2026-06-06",
    refundEligible: true,
    notes: ["Warehouse has not generated a label yet."]
  },
  D4040: {
    orderId: "D4040",
    status: "delivered",
    item: "Final Sale Candle",
    customerName: "Dev",
    orderDate: "2026-04-10",
    deliveredAt: "2026-04-15",
    refundEligible: false,
    notes: ["Final-sale consumable; refund is not allowed unless defective."]
  },
  E5050: {
    orderId: "E5050",
    status: "cancelled",
    item: "Desk Lamp",
    customerName: "Eli",
    orderDate: "2026-05-02",
    refundEligible: false,
    notes: ["Order was cancelled before fulfillment."]
  },
  F6060: {
    orderId: "F6060",
    status: "refunded",
    item: "Running Socks",
    customerName: "Fatima",
    orderDate: "2026-04-22",
    deliveredAt: "2026-04-26",
    refundEligible: false,
    notes: ["Refund was issued on 2026-05-03."]
  },
  G7070: {
    orderId: "G7070",
    status: "shipped",
    item: "Ceramic Bowl",
    customerName: "Gus",
    orderDate: "2026-05-25",
    estimatedDelivery: "2026-06-04",
    carrierId: "CARR-12",
    refundEligible: true,
    notes: ["Carrier has regular movement."]
  }
};

export const SHIPPING_FIXTURES: Record<string, ShippingData> = {
  "CARR-77": {
    carrierId: "CARR-77",
    carrier: "ParcelGo",
    status: "delayed",
    lastScan: "2026-05-27 21:14 at North Hub",
    eta: "2026-06-04",
    notes: ["No movement for more than 72 hours after original ETA."]
  },
  "CARR-12": {
    carrierId: "CARR-12",
    carrier: "SwiftShip",
    status: "in_transit",
    lastScan: "2026-06-02 09:40 at West Hub",
    eta: "2026-06-04",
    notes: ["Package is still inside the delivery window."]
  }
};

export function lookupOrder(orderId: string): OrderData {
  const normalized = orderId.trim().toUpperCase();
  return (
    ORDER_FIXTURES[normalized] ?? {
      orderId: normalized,
      status: "not_found",
      item: "Unknown",
      customerName: "Unknown",
      orderDate: "Unknown",
      refundEligible: false,
      notes: ["No order fixture was found for this order id."]
    }
  );
}

export function lookupShipping(carrierId: string): ShippingData {
  const normalized = carrierId.trim().toUpperCase();
  return (
    SHIPPING_FIXTURES[normalized] ?? {
      carrierId: normalized,
      carrier: "Unknown",
      status: "unknown",
      lastScan: "Unknown",
      notes: ["No shipping fixture was found for this carrier id."]
    }
  );
}

export const lookupOrderTool = tool(({ orderId }) => lookupOrder(orderId), {
  name: "lookup_order",
  description: "Look up deterministic order status by order id.",
  schema: z.object({
    orderId: z.string().describe("Order id such as A1001 or B2042.")
  })
});

export const lookupShippingTool = tool(({ carrierId }) => lookupShipping(carrierId), {
  name: "lookup_shipping",
  description: "Look up deterministic shipping and carrier status by carrier id.",
  schema: z.object({
    carrierId: z.string().describe("Carrier id from an order record, such as CARR-77.")
  })
});
