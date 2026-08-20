import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateSummary,
  normalizeFinanceData,
  parsePositiveNumber,
  today,
  type FinanceData,
} from "../app/finance/model.ts";

test("formats dates in Korea instead of UTC", () => {
  const shortlyAfterMidnightInSeoul = new Date("2026-08-13T15:30:00.000Z");
  assert.equal(today(shortlyAfterMidnightInSeoul), "2026-08-14");
});

test("accepts comma-formatted money and rejects invalid amounts", () => {
  assert.equal(parsePositiveNumber("70,000"), 70_000);
  assert.equal(parsePositiveNumber(" ₩ 1,234 원 "), 1_234);
  assert.equal(parsePositiveNumber("0"), null);
  assert.equal(parsePositiveNumber("not-money"), null);
});

test("preserves a valid zero cash balance while normalizing cloud data", () => {
  const fallback: FinanceData = {
    transactions: [],
    stocks: [],
    settings: { cashBalance: 99, priceMode: "demo" },
  };
  const normalized = normalizeFinanceData({ transactions: [], stocks: [], settings: { cashBalance: 0, priceMode: "manual" } }, fallback);
  assert.deepEqual(normalized.settings, { cashBalance: 0, priceMode: "manual" });
});

test("calculates the monthly cash flow and portfolio totals", () => {
  const summary = calculateSummary(
    [
      { id: "income", type: "income", amount: 1_000, category: "월급", memo: "월급", date: "2026-08-01" },
      { id: "expense", type: "expense", amount: 200, category: "식비", memo: "점심", date: "2026-08-02" },
      { id: "old", type: "expense", amount: 500, category: "식비", memo: "지난달", date: "2026-07-31" },
    ],
    [{ id: "stock", broker: "증권", name: "회사", ticker: "TEST", buyDate: "2026-08-03", buyPrice: 100, quantity: 2, currentPrice: 120, priceSource: "manual", updatedAt: "방금" }],
    { cashBalance: 5_000, priceMode: "manual" },
    new Date("2026-08-14T00:00:00.000Z"),
  );

  assert.deepEqual(summary, {
    income: 1_000,
    expense: 200,
    investment: 200,
    principal: 200,
    valuation: 240,
    profit: 40,
    returnRate: 20,
    total: 5_240,
  });
});
