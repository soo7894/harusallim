export type Tab = "home" | "transactions" | "investments" | "settings";
export type TransactionType = "income" | "expense";
export type PriceMode = "demo" | "manual";

export type Transaction = {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  memo: string;
  date: string;
};

export type Stock = {
  id: string;
  broker: string;
  name: string;
  ticker: string;
  buyDate: string;
  buyPrice: number;
  quantity: number;
  currentPrice: number;
  priceSource: "demo" | "manual" | "api";
  updatedAt: string;
};

export type Settings = {
  cashBalance: number;
  priceMode: PriceMode;
};

export type FinanceData = {
  transactions: Transaction[];
  stocks: Stock[];
  settings: Settings;
};

export type FinanceSummary = {
  income: number;
  expense: number;
  investment: number;
  principal: number;
  valuation: number;
  profit: number;
  returnRate: number;
  total: number;
};

export const money = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0,
});

export const number = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 2 });

export const defaultSettings: Settings = {
  cashBalance: 12_840_000,
  priceMode: "demo",
};

export const blankSettings: Settings = {
  cashBalance: 0,
  priceMode: "demo",
};

export const emptyFinanceData: FinanceData = {
  transactions: [],
  stocks: [],
  settings: blankSettings,
};

export const legacyStorageKeys = [
  "harusallim-transactions",
  "harusallim-stocks",
  "harusallim-settings",
] as const;

export const migrationOwnerKey = "harusallim-cloud-migration-owner";
export const sourceLabel = { demo: "데모 가격", manual: "직접 입력", api: "API 조회" } as const;

const SEOUL_TIME_ZONE = "Asia/Seoul";
const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: SEOUL_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function today(date = new Date()) {
  return dateFormatter.format(date);
}

export function monthKey(date = new Date()) {
  return today(date).slice(0, 7);
}

export function createId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function relativeDate(day: number) {
  const now = new Date();
  const parts = dateFormatter.formatToParts(now);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const safeDay = Math.min(day, new Date(year, month, 0).getDate());
  return `${year}-${String(month).padStart(2, "0")}-${String(safeDay).padStart(2, "0")}`;
}

export function makeDemoData(): Pick<FinanceData, "transactions" | "stocks"> {
  return {
    transactions: [
      { id: "t1", type: "income", amount: 3_200_000, category: "월급", memo: "8월 월급", date: relativeDate(5) },
      { id: "t2", type: "expense", amount: 720_000, category: "주거", memo: "월세", date: relativeDate(7) },
      { id: "t3", type: "expense", amount: 56_800, category: "식비", memo: "이번 주 장보기", date: relativeDate(11) },
      { id: "t4", type: "expense", amount: 13_200, category: "교통", memo: "대중교통 충전", date: relativeDate(13) },
    ],
    stocks: [
      {
        id: "s1",
        broker: "키움증권",
        name: "삼성전자",
        ticker: "005930",
        buyDate: relativeDate(8),
        buyPrice: 70_000,
        quantity: 10,
        currentPrice: 75_000,
        priceSource: "demo",
        updatedAt: "데모 가격",
      },
      {
        id: "s2",
        broker: "토스증권",
        name: "Apple",
        ticker: "AAPL",
        buyDate: relativeDate(2),
        buyPrice: 245_000,
        quantity: 3,
        currentPrice: 261_000,
        priceSource: "demo",
        updatedAt: "데모 가격",
      },
    ],
  };
}

export function parsePositiveNumber(value: FormDataEntryValue | string | null | undefined) {
  const normalized = String(value ?? "").replace(/[\s,₩원]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function readLegacyFinanceData(): { data: FinanceData; hasLegacyData: boolean } {
  const demo = makeDemoData();
  const saved = readJson<Partial<Settings>>("harusallim-settings", defaultSettings);
  const parsedCashBalance = Number(saved.cashBalance);
  return {
    data: {
      transactions: readJson("harusallim-transactions", demo.transactions),
      stocks: readJson("harusallim-stocks", demo.stocks),
      settings: {
        cashBalance: Number.isFinite(parsedCashBalance) ? parsedCashBalance : defaultSettings.cashBalance,
        priceMode: saved.priceMode === "manual" ? "manual" : "demo",
      },
    },
    hasLegacyData: legacyStorageKeys.some((key) => localStorage.getItem(key) !== null),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function normalizeTransactions(value: unknown, fallback: Transaction[]) {
  if (!Array.isArray(value)) return fallback;
  const normalized = value.flatMap((entry): Transaction[] => {
    if (!isRecord(entry)) return [];
    const amount = Number(entry.amount);
    if (
      typeof entry.id !== "string" ||
      (entry.type !== "income" && entry.type !== "expense") ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      typeof entry.category !== "string" ||
      typeof entry.memo !== "string" ||
      !isIsoDate(entry.date)
    ) return [];
    return [{ ...entry, amount } as Transaction];
  });
  return normalized.length || value.length === 0 ? normalized : fallback;
}

function normalizeStocks(value: unknown, fallback: Stock[]) {
  if (!Array.isArray(value)) return fallback;
  const normalized = value.flatMap((entry): Stock[] => {
    if (!isRecord(entry)) return [];
    const buyPrice = Number(entry.buyPrice);
    const quantity = Number(entry.quantity);
    const currentPrice = Number(entry.currentPrice);
    if (
      typeof entry.id !== "string" ||
      typeof entry.broker !== "string" ||
      typeof entry.name !== "string" ||
      typeof entry.ticker !== "string" ||
      !isIsoDate(entry.buyDate) ||
      !Number.isFinite(buyPrice) || buyPrice <= 0 ||
      !Number.isFinite(quantity) || quantity <= 0 ||
      !Number.isFinite(currentPrice) || currentPrice <= 0 ||
      (entry.priceSource !== "demo" && entry.priceSource !== "manual" && entry.priceSource !== "api") ||
      typeof entry.updatedAt !== "string"
    ) return [];
    return [{ ...entry, buyPrice, quantity, currentPrice } as Stock];
  });
  return normalized.length || value.length === 0 ? normalized : fallback;
}

export function normalizeFinanceData(value: unknown, fallback: FinanceData): FinanceData {
  if (!isRecord(value)) return fallback;
  const settings = isRecord(value.settings) ? value.settings : fallback.settings;
  const cashBalance = Number(settings.cashBalance);
  return {
    transactions: normalizeTransactions(value.transactions, fallback.transactions),
    stocks: normalizeStocks(value.stocks, fallback.stocks),
    settings: {
      cashBalance: Number.isFinite(cashBalance) && cashBalance >= 0 ? cashBalance : fallback.settings.cashBalance,
      priceMode: settings.priceMode === "manual" ? "manual" : "demo",
    },
  };
}

export function calculateSummary(
  transactions: Transaction[],
  stocks: Stock[],
  settings: Settings,
  date = new Date(),
): FinanceSummary {
  const currentMonth = monthKey(date);
  const monthTransactions = transactions.filter((item) => item.date.startsWith(currentMonth));
  const income = monthTransactions.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0);
  const expense = monthTransactions.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0);
  const investment = stocks.filter((item) => item.buyDate.startsWith(currentMonth)).reduce((sum, item) => sum + item.buyPrice * item.quantity, 0);
  const principal = stocks.reduce((sum, item) => sum + item.buyPrice * item.quantity, 0);
  const valuation = stocks.reduce((sum, item) => sum + item.currentPrice * item.quantity, 0);
  const profit = valuation - principal;
  const returnRate = principal ? (profit / principal) * 100 : 0;
  return { income, expense, investment, principal, valuation, profit, returnRate, total: settings.cashBalance + valuation };
}
