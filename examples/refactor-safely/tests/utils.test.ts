import { beforeEach, describe, expect, it } from "vitest";
import {
  clearCache,
  customerLabel,
  formatDate,
  formatDateTime,
  formatMoney,
  formatMoneyShort,
  lineTotal,
  orderTotal,
  slug,
  summarize,
  truncate,
  type Order,
} from "../src/utils";
import { buildReport } from "../src/report";

const order = (over: Partial<Order> = {}): Order => ({
  id: "o1",
  createdAt: "2026-03-05T09:07:00Z",
  items: [{ sku: "A", qty: 2, price: 1000 }],
  ...over,
});

beforeEach(() => clearCache());

describe("formatMoney", () => {
  it("formats with thousands separators and symbol", () => {
    expect(formatMoney(123456789)).toBe("€1,234,567.89");
    expect(formatMoney(5, "USD")).toBe("$0.05");
    expect(formatMoney(-150, "GBP")).toBe("-£1.50");
    expect(formatMoney(100000, "CHF")).toBe("1,000.00 CHF");
    expect(formatMoney(0)).toBe("€0.00");
  });
  it("short form rounds to whole units", () => {
    expect(formatMoneyShort(123450)).toBe("€1,235");
    expect(formatMoneyShort(-99, "USD")).toBe("-$1");
    expect(formatMoneyShort(100000000, "CHF")).toBe("1,000,000 CHF");
  });
});

describe("lineTotal", () => {
  it("applies default 25% tax", () => expect(lineTotal({ sku: "A", qty: 2, price: 1000 })).toBe(2500));
  it("applies percentage discount", () =>
    expect(lineTotal({ sku: "A", qty: 1, price: 1000, discount: 0.1, taxRate: 0.1 })).toBe(990));
  it("applies absolute discount and floors at 0", () => {
    expect(lineTotal({ sku: "A", qty: 1, price: 1000, discount: 200, taxRate: 0.05 })).toBe(840);
    expect(lineTotal({ sku: "A", qty: 1, price: 100, discount: 500 })).toBe(0);
  });
  it("treats taxRate 0 as default 25% (current behavior)", () =>
    expect(lineTotal({ sku: "A", qty: 1, price: 100, taxRate: 0 })).toBe(125));
});

describe("orderTotal", () => {
  it("sums lines", () => expect(orderTotal(order())).toBe(2500));
  it("gives foreign customers a 500 discount above 10000", () => {
    const o = order({ items: [{ sku: "A", qty: 10, price: 1000 }], customer: { country: "DE" } });
    expect(orderTotal(o)).toBe(12000);
  });
  it("caches by order id until cleared", () => {
    expect(orderTotal(order())).toBe(2500);
    expect(orderTotal(order({ items: [] }))).toBe(2500);
    clearCache();
    expect(orderTotal(order({ items: [] }))).toBe(0);
  });
});

describe("dates", () => {
  it("formats dd.mm.yyyy.", () => expect(formatDate("2026-03-05T09:07:00Z")).toBe("05.03.2026."));
  it("formats date-time", () => expect(formatDateTime("2026-12-25T18:30:00Z")).toBe("25.12.2026. 18:30"));
  it("returns empty string for invalid", () => {
    expect(formatDate("nope")).toBe("");
    expect(formatDateTime("nope")).toBe("");
  });
});

describe("strings", () => {
  it("labels customers", () => {
    expect(customerLabel(order())).toBe("Guest");
    expect(customerLabel(order({ customer: { name: "   " } }))).toBe("Guest");
    expect(customerLabel(order({ customer: { name: " Ana " } }))).toBe("Ana");
    expect(customerLabel(order({ customer: { name: "A".repeat(25) } }))).toBe("A".repeat(20) + "…");
  });
  it("slugifies Croatian letters", () => expect(slug("  Čevapi & Šljivovica  ")).toBe("cevapi-sljivovica"));
  it("truncates", () => {
    expect(truncate("hello", 3)).toBe("hel…");
    expect(truncate("hi", 3)).toBe("hi");
  });
});

describe("summarize / buildReport", () => {
  it("summarizes orders", () => {
    expect(summarize([order(), order({ id: "o2", customer: { name: "Ana" } })])).toBe(
      "05.03.2026. Guest €25.00\n05.03.2026. Ana €25.00\nTOTAL €50.00",
    );
  });
  it("builds a report", () => {
    const r = buildReport("March Sales", [order()]);
    expect(r.filename).toBe("march-sales.txt");
    expect(r.headline).toBe("March Sales — €25");
    expect(r.body.startsWith("05.03.2026. Guest €25.00\nTOTAL €25.00\nGenerated ")).toBe(true);
  });
});
