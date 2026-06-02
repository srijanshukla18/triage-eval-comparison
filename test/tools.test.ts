import { describe, expect, it } from "vitest";
import { lookupOrder, lookupShipping } from "../src/agent/tools.js";

describe("mock tools", () => {
  it("returns deterministic order lookups", async () => {
    const first = await lookupOrder("B2042");
    const second = await lookupOrder("B2042");
    expect(second).toEqual(first);
    expect(first.status).toBe("shipped_ambiguous");
  });

  it("returns deterministic shipping lookups", async () => {
    const first = await lookupShipping("CARR-77");
    const second = await lookupShipping("CARR-77");
    expect(second).toEqual(first);
    expect(first.status).toBe("delayed");
  });

  it("is idempotent for missing records", async () => {
    expect(lookupOrder("NOPE")).toEqual(lookupOrder("NOPE"));
    expect(lookupOrder("NOPE").status).toBe("not_found");
    expect(lookupShipping("carrier-NOPE")).toEqual(lookupShipping("carrier-NOPE"));
    expect(lookupShipping("carrier-NOPE").status).toBe("unknown");
  });
});
