import { describe, expect, it } from "vitest";
import { CATEGORIES } from "../src/agent/types.js";
import { TICKETS } from "../src/eval/dataset.js";

describe("eval dataset", () => {
  it("has exactly 25 stable rows", () => {
    expect(TICKETS).toHaveLength(25);
    expect(new Set(TICKETS.map((ticket) => ticket.id)).size).toBe(25);
  });

  it("covers every category", () => {
    const categories = new Set(TICKETS.map((ticket) => ticket.expected_category));
    for (const category of CATEGORIES) {
      expect(categories.has(category)).toBe(true);
    }
  });

  it("expects the model-decided shipping lookup as a sequence where carrier evidence is needed", () => {
    const ambiguous = TICKETS.find((ticket) => ticket.id === "ambiguous-shipped-late");
    expect(ambiguous?.expected_tools).toEqual(["lookup_order", "lookup_shipping"]);

    for (const ticket of TICKETS) {
      if (ticket.expected_tools.includes("lookup_shipping")) {
        expect(ticket.expected_tools[0]).toBe("lookup_order");
      }
    }
  });

  it("includes required adversarial cases", () => {
    const ids = new Set(TICKETS.map((ticket) => ticket.id));
    expect(ids.has("missing-order-id")).toBe(true);
    expect(ids.has("hostile-late-order")).toBe(true);
    expect(ids.has("non-native-english")).toBe(true);
    expect(ids.has("impossible-policy-request")).toBe(true);
    expect(ids.has("refund-denial")).toBe(true);
    expect(ids.has("multi-intent-shipping-refund")).toBe(true);
    expect(ids.has("ambiguous-shipped-late")).toBe(true);
  });
});
