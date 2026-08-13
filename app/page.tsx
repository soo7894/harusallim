"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Tab = "home" | "transactions" | "investments" | "settings";
type TransactionType = "income" | "expense";
type PriceMode = "demo" | "manual" | "api";

type Transaction = {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  memo: string;
  date: string;
};

type Stock = {
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

type Settings = {
  cashBalance: number;
  priceMode: PriceMode;
  apiUrl: string;
  apiKey: string;
  pricePath: string;
};

const money = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0,
});

const number = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 2 });

const today = () => new Date().toISOString().slice(0, 10);
const monthKey = () => today().slice(0, 7);
const uid = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

function relativeDate(day: number) {
  const now = new Date();
  const safeDay = Math.min(day, new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate());
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(safeDay).padStart(2, "0")}`;
}

function makeDemoData() {
  const transactions: Transaction[] = [
    { id: "t1", type: "income", amount: 3200000, category: "월급", memo: "8월 월급", date: relativeDate(5) },
    { id: "t2", type: "expense", amount: 720000, category: "주거", memo: "월세", date: relativeDate(7) },
    { id: "t3", type: "expense", amount: 56800, category: "식비", memo: "이번 주 장보기", date: relativeDate(11) },
    { id: "t4", type: "expense", amount: 13200, category: "교통", memo: "대중교통 충전", date: relativeDate(13) },
  ];
  const stocks: Stock[] = [
    {
      id: "s1",
      broker: "키움증권",
      name: "삼성전자",
      ticker: "005930",
      buyDate: relativeDate(8),
      buyPrice: 70000,
      quantity: 10,
      currentPrice: 75000,
      priceSource: "demo",
      updatedAt: "데모 가격",
    },
    {
      id: "s2",
      broker: "토스증권",
      name: "Apple",
      ticker: "AAPL",
      buyDate: relativeDate(2),
      buyPrice: 245000,
      quantity: 3,
      currentPrice: 261000,
      priceSource: "demo",
      updatedAt: "데모 가격",
    },
  ];
  return { transactions, stocks };
}

const defaultSettings: Settings = {
  cashBalance: 12840000,
  priceMode: "demo",
  apiUrl: "",
  apiKey: "",
  pricePath: "price",
};

const sourceLabel = { demo: "데모 가격", manual: "직접 입력", api: "API 조회" };

function readJson<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function getNestedValue(data: unknown, path: string): unknown {
  return path.split(".").filter(Boolean).reduce<unknown>((value, key) => {
    if (value && typeof value === "object" && key in value) {
      return (value as Record<string, unknown>)[key];
    }
    return undefined;
  }, data);
}

export default function Home() {
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>("home");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [modal, setModal] = useState<"transaction" | "stock" | null>(null);
  const [transactionType, setTransactionType] = useState<TransactionType>("expense");
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [priceDraft, setPriceDraft] = useState("");
  const [toast, setToast] = useState("");
  const [loadingPrices, setLoadingPrices] = useState(false);

  useEffect(() => {
    const demo = makeDemoData();
    setTransactions(readJson("harusallim-transactions", demo.transactions));
    setStocks(readJson("harusallim-stocks", demo.stocks));
    setSettings(readJson("harusallim-settings", defaultSettings));
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem("harusallim-transactions", JSON.stringify(transactions));
  }, [transactions, ready]);

  useEffect(() => {
    if (ready) localStorage.setItem("harusallim-stocks", JSON.stringify(stocks));
  }, [stocks, ready]);

  useEffect(() => {
    if (ready) localStorage.setItem("harusallim-settings", JSON.stringify(settings));
  }, [settings, ready]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const summary = useMemo(() => {
    const currentMonth = monthKey();
    const monthTransactions = transactions.filter((item) => item.date.startsWith(currentMonth));
    const income = monthTransactions.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0);
    const expense = monthTransactions.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0);
    const investment = stocks.filter((item) => item.buyDate.startsWith(currentMonth)).reduce((sum, item) => sum + item.buyPrice * item.quantity, 0);
    const principal = stocks.reduce((sum, item) => sum + item.buyPrice * item.quantity, 0);
    const valuation = stocks.reduce((sum, item) => sum + item.currentPrice * item.quantity, 0);
    const profit = valuation - principal;
    const returnRate = principal ? (profit / principal) * 100 : 0;
    return { income, expense, investment, principal, valuation, profit, returnRate, total: settings.cashBalance + valuation };
  }, [transactions, stocks, settings.cashBalance]);

  const latestTransactions = [...transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

  function addTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const amount = Number(form.get("amount"));
    if (!amount) return;
    setTransactions((items) => [
      ...items,
      {
        id: uid(),
        type: transactionType,
        amount,
        category: String(form.get("category")),
        memo: String(form.get("memo") || String(form.get("category"))),
        date: String(form.get("date")),
      },
    ]);
    setModal(null);
    setToast(`${transactionType === "income" ? "수입" : "지출"}을 기록했어요`);
  }

  function addStock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const buyPrice = Number(form.get("buyPrice"));
    const quantity = Number(form.get("quantity"));
    const currentPrice = Number(form.get("currentPrice")) || buyPrice;
    if (!buyPrice || !quantity) return;
    setStocks((items) => [
      ...items,
      {
        id: uid(),
        broker: String(form.get("broker")),
        name: String(form.get("name")),
        ticker: String(form.get("ticker")).toUpperCase(),
        buyDate: String(form.get("buyDate")),
        buyPrice,
        quantity,
        currentPrice,
        priceSource: "manual",
        updatedAt: "방금 입력",
      },
    ]);
    setModal(null);
    setToast("주식 매수 내역을 추가했어요");
  }

  function saveManualPrice(id: string) {
    const currentPrice = Number(priceDraft.replaceAll(",", ""));
    if (!currentPrice) return;
    setStocks((items) => items.map((item) => item.id === id ? { ...item, currentPrice, priceSource: "manual", updatedAt: "방금 수정" } : item));
    setEditingPrice(null);
    setToast("현재가를 반영했어요");
  }

  async function fetchLivePrices() {
    if (settings.priceMode === "demo") {
      setStocks((items) => items.map((item, index) => ({
        ...item,
        currentPrice: Math.round(item.currentPrice * (1 + (index % 2 === 0 ? 0.004 : -0.002))),
        priceSource: "demo",
        updatedAt: "방금 데모 갱신",
      })));
      setToast("데모 가격을 새로 불러왔어요");
      return;
    }
    if (settings.priceMode === "manual") {
      setToast("각 종목의 ‘가격 수정’을 눌러 입력해 주세요");
      return;
    }
    if (!settings.apiUrl) {
      setTab("settings");
      setToast("먼저 API 주소를 입력해 주세요");
      return;
    }
    setLoadingPrices(true);
    try {
      const next = await Promise.all(stocks.map(async (stock) => {
        const url = settings.apiUrl.replaceAll("{ticker}", encodeURIComponent(stock.ticker));
        const response = await fetch(url, {
          headers: settings.apiKey ? { Authorization: `Bearer ${settings.apiKey}` } : undefined,
        });
        if (!response.ok) throw new Error(`${stock.ticker} 조회 실패`);
        const data: unknown = await response.json();
        const currentPrice = Number(getNestedValue(data, settings.pricePath));
        if (!currentPrice) throw new Error(`${stock.ticker} 가격 형식 오류`);
        return { ...stock, currentPrice, priceSource: "api" as const, updatedAt: "방금 API 조회" };
      }));
      setStocks(next);
      setToast("모든 현재가를 업데이트했어요");
    } catch {
      setToast("API 조회에 실패했어요. 주소와 응답 경로를 확인해 주세요");
    } finally {
      setLoadingPrices(false);
    }
  }

  function resetDemo() {
    const demo = makeDemoData();
    setTransactions(demo.transactions);
    setStocks(demo.stocks);
    setSettings(defaultSettings);
    setToast("처음 데모 상태로 돌아왔어요");
  }

  if (!ready) {
    return <main className="loading-screen"><div className="brand-mark">ㅎ</div><p>내 살림을 불러오는 중이에요</p></main>;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => setTab("home")} aria-label="하루살림 홈">
          <span className="brand-mark">ㅎ</span>
          <span><strong>하루살림</strong><small>쉬운 돈 관리</small></span>
        </button>
        <nav aria-label="주요 메뉴">
          <NavButton active={tab === "home"} icon="⌂" label="홈" onClick={() => setTab("home")} />
          <NavButton active={tab === "transactions"} icon="↕" label="수입 · 지출" onClick={() => setTab("transactions")} />
          <NavButton active={tab === "investments"} icon="↗" label="나의 투자" onClick={() => setTab("investments")} />
          <NavButton active={tab === "settings"} icon="⚙" label="가격 연결" onClick={() => setTab("settings")} />
        </nav>
        <div className="sidebar-note">
          <span>🔒</span>
          <p><strong>계좌 연결 없이 안전하게</strong>입력한 내용은 이 기기에만 저장돼요.</p>
        </div>
        <div className="profile-chip"><span>나</span><div><strong>나의 살림</strong><small>오늘도 한 걸음 🌱</small></div></div>
      </aside>

      <main className="main-content">
        <header className="mobile-header">
          <button className="brand" onClick={() => setTab("home")}><span className="brand-mark">ㅎ</span><strong>하루살림</strong></button>
          <button className="icon-button" onClick={() => setTab("settings")} aria-label="설정">⚙</button>
        </header>

        {tab === "home" && (
          <>
            <section className="page-heading home-heading">
              <div><p className="eyebrow">{new Date().getMonth() + 1}월의 살림</p><h1>안녕하세요!<br /><em>내 돈의 오늘</em>을 살펴볼까요?</h1></div>
              <div className="header-actions"><button className="secondary-button" onClick={() => setModal("stock")}><span>↗</span> 주식 추가</button><button className="primary-button" onClick={() => setModal("transaction")}><span>＋</span> 수입 · 지출 기록</button></div>
            </section>

            <section className="hero-card">
              <div className="hero-copy">
                <div className="hero-label"><span>●</span> 오늘의 총자산 <button className="tooltip" title="현금성 자산과 주식 현재 평가액을 더한 금액이에요">?</button></div>
                <strong className="total-asset">{money.format(summary.total)}</strong>
                <p>현금과 주식을 모두 합친 금액이에요</p>
                <div className="asset-pills"><span>현금성 자산 <b>{money.format(settings.cashBalance)}</b></span><span>주식 평가액 <b>{money.format(summary.valuation)}</b></span></div>
              </div>
              <div className="hero-visual" aria-hidden="true">
                <div className="sun"></div><div className="cloud cloud-one"></div><div className="cloud cloud-two"></div>
                <div className="hill hill-back"></div><div className="hill hill-front"></div>
                <div className="sprout"><i></i><b></b><span></span></div>
                <div className="coin coin-one">₩</div><div className="coin coin-two">₩</div>
              </div>
            </section>

            <section className="section-block">
              <div className="section-title"><div><span className="section-icon peach">▤</span><div><h2>이번 달 한눈에 보기</h2><p>들어오고, 쓰고, 투자한 돈이에요</p></div></div><span className="month-badge">{new Date().getMonth() + 1}월</span></div>
              <div className="summary-grid">
                <SummaryCard icon="↓" tone="mint" label="들어온 돈" value={summary.income} note="이번 달 수입" />
                <SummaryCard icon="↑" tone="peach" label="나간 돈" value={summary.expense} note="이번 달 지출" />
                <SummaryCard icon="↗" tone="lavender" label="투자한 돈" value={summary.investment} note="이번 달 매수 금액" />
                <article className="summary-card balance-card"><div><span className="summary-icon cream">♥</span><p>남은 돈</p></div><strong>{money.format(summary.income - summary.expense - summary.investment)}</strong><small>수입 − 지출 − 투자</small></article>
              </div>
            </section>

            <section className="dashboard-grid">
              <article className="panel transaction-panel">
                <div className="panel-heading"><div><h2>최근 기록</h2><p>가장 최근 수입과 지출이에요</p></div><button className="text-button" onClick={() => setTab("transactions")}>전체 보기 →</button></div>
                <div className="record-list">
                  {latestTransactions.map((item) => <TransactionRow key={item.id} item={item} onDelete={() => setTransactions((items) => items.filter((row) => row.id !== item.id))} />)}
                </div>
                <button className="wide-dashed-button" onClick={() => setModal("transaction")}>＋ 새 기록 남기기</button>
              </article>

              <article className="panel investment-preview">
                <div className="panel-heading"><div><h2>나의 투자</h2><p>지금 얼마나 자랐을까요?</p></div><button className="text-button" onClick={() => setTab("investments")}>자세히 →</button></div>
                <div className="investment-total"><div><span>주식 평가액</span><strong>{money.format(summary.valuation)}</strong></div><span className={summary.profit >= 0 ? "gain-badge" : "loss-badge"}>{summary.profit >= 0 ? "+" : ""}{number.format(summary.returnRate)}%</span></div>
                <div className="portfolio-bar"><span style={{ width: `${Math.max(8, Math.min(100, (summary.valuation / Math.max(summary.total, 1)) * 100))}%` }}></span></div>
                <div className="portfolio-legend"><span><i></i>주식 {number.format((summary.valuation / Math.max(summary.total, 1)) * 100)}%</span><span>전체 자산 중</span></div>
                <div className="mini-stock-list">{stocks.slice(0, 2).map((stock) => <MiniStock key={stock.id} stock={stock} />)}</div>
                <button className="price-update" onClick={fetchLivePrices} disabled={loadingPrices}>{loadingPrices ? "가격을 확인하는 중…" : "↻ 현재가 새로고침"}</button>
                <p className="price-footnote">{settings.priceMode === "demo" ? "지금은 데모 가격으로 보여드려요" : settings.priceMode === "manual" ? "현재가는 직접 입력하는 방식이에요" : "설정한 외부 API에서 가격을 불러와요"}</p>
              </article>
            </section>

            <section className="tip-card"><span className="tip-illustration">💡</span><div><strong>오늘의 돈 습관</strong><p>작은 지출도 그날 기록하면 한 달 뒤 내 소비 흐름이 또렷하게 보여요.</p></div><button onClick={() => setModal("transaction")}>지금 기록하기</button></section>
          </>
        )}

        {tab === "transactions" && (
          <section className="subpage">
            <div className="page-heading"><div><p className="eyebrow">차곡차곡 기록해요</p><h1>수입 · 지출</h1><p className="heading-description">돈이 들어오고 나간 순간을 가볍게 적어보세요.</p></div><button className="primary-button" onClick={() => setModal("transaction")}>＋ 새 기록</button></div>
            <div className="summary-grid compact"><SummaryCard icon="↓" tone="mint" label="이번 달 수입" value={summary.income} note="들어온 돈" /><SummaryCard icon="↑" tone="peach" label="이번 달 지출" value={summary.expense} note="나간 돈" /><SummaryCard icon="=" tone="lavender" label="이번 달 잔액" value={summary.income - summary.expense} note="수입 − 지출" /></div>
            <article className="panel table-panel">
              <div className="panel-heading"><div><h2>전체 기록</h2><p>최근 날짜 순으로 보여드려요</p></div><span className="count-badge">{transactions.length}건</span></div>
              <div className="record-list roomy">{[...transactions].sort((a, b) => b.date.localeCompare(a.date)).map((item) => <TransactionRow key={item.id} item={item} onDelete={() => setTransactions((items) => items.filter((row) => row.id !== item.id))} />)}</div>
              {!transactions.length && <EmptyState icon="📝" title="아직 기록이 없어요" body="첫 수입이나 지출을 남겨보세요." action="첫 기록 남기기" onClick={() => setModal("transaction")} />}
            </article>
          </section>
        )}

        {tab === "investments" && (
          <section className="subpage">
            <div className="page-heading"><div><p className="eyebrow">계좌 연결은 필요 없어요</p><h1>나의 투자</h1><p className="heading-description">매수 내역은 직접, 현재 가격은 원하는 방식으로 관리해요.</p></div><div className="header-actions"><button className="secondary-button" onClick={fetchLivePrices} disabled={loadingPrices}>↻ 현재가 갱신</button><button className="primary-button" onClick={() => setModal("stock")}>＋ 주식 추가</button></div></div>
            <div className="investment-summary">
              <div><span>투자 원금</span><strong>{money.format(summary.principal)}</strong></div><div><span>현재 평가액</span><strong>{money.format(summary.valuation)}</strong></div><div><span>평가 손익</span><strong className={summary.profit >= 0 ? "positive" : "negative"}>{summary.profit >= 0 ? "+" : ""}{money.format(summary.profit)}</strong></div><div><span>수익률</span><strong className={summary.profit >= 0 ? "positive" : "negative"}>{summary.profit >= 0 ? "+" : ""}{number.format(summary.returnRate)}%</strong></div>
            </div>
            <div className="mode-notice"><span className={`mode-dot ${settings.priceMode}`}></span><p><strong>{settings.priceMode === "demo" ? "데모 가격 사용 중" : settings.priceMode === "manual" ? "수동 가격 사용 중" : "외부 API 연결 중"}</strong>{settings.priceMode === "demo" ? "API 키가 없어도 모든 계산을 체험할 수 있어요." : settings.priceMode === "manual" ? "종목별로 현재가를 직접 바꿀 수 있어요." : "가격 연결 설정에 입력한 주소를 사용해요."}</p><button onClick={() => setTab("settings")}>방식 바꾸기</button></div>
            <div className="stock-grid">
              {stocks.map((stock) => {
                const principal = stock.buyPrice * stock.quantity;
                const valuation = stock.currentPrice * stock.quantity;
                const profit = valuation - principal;
                const rate = principal ? (profit / principal) * 100 : 0;
                return <article className="stock-card" key={stock.id}>
                  <div className="stock-card-top"><div className="stock-avatar">{stock.name.slice(0, 1)}</div><div><h3>{stock.name}</h3><p>{stock.ticker} · {stock.broker}</p></div><button className="more-button" aria-label={`${stock.name} 삭제`} onClick={() => { if (window.confirm(`${stock.name} 내역을 삭제할까요?`)) setStocks((items) => items.filter((item) => item.id !== stock.id)); }}>×</button></div>
                  <dl className="stock-metrics"><div><dt>보유 수량</dt><dd>{number.format(stock.quantity)}주</dd></div><div><dt>평균 매수가</dt><dd>{money.format(stock.buyPrice)}</dd></div><div><dt>현재가</dt><dd>{money.format(stock.currentPrice)}</dd></div><div><dt>평가 금액</dt><dd>{money.format(valuation)}</dd></div></dl>
                  <div className="stock-profit"><span>평가손익</span><strong className={profit >= 0 ? "positive" : "negative"}>{profit >= 0 ? "+" : ""}{money.format(profit)} <small>({profit >= 0 ? "+" : ""}{number.format(rate)}%)</small></strong></div>
                  {editingPrice === stock.id ? <div className="inline-price"><label><span className="sr-only">새 현재가</span><input autoFocus inputMode="numeric" value={priceDraft} onChange={(e) => setPriceDraft(e.target.value)} placeholder="새 현재가" /></label><button onClick={() => saveManualPrice(stock.id)}>저장</button><button className="cancel" onClick={() => setEditingPrice(null)}>취소</button></div> : <div className="stock-card-bottom"><span className={`source-chip ${stock.priceSource}`}>{sourceLabel[stock.priceSource]} · {stock.updatedAt}</span><button onClick={() => { setEditingPrice(stock.id); setPriceDraft(String(stock.currentPrice)); }}>가격 수정</button></div>}
                </article>;
              })}
              {!stocks.length && <EmptyState icon="🌱" title="아직 담은 주식이 없어요" body="계좌 연결 없이 매수 내역만 적으면 돼요." action="첫 주식 추가하기" onClick={() => setModal("stock")} />}
            </div>
          </section>
        )}

        {tab === "settings" && (
          <section className="subpage settings-page">
            <div className="page-heading"><div><p className="eyebrow">내게 맞게 선택해요</p><h1>가격 연결</h1><p className="heading-description">API 키가 없어도 데모나 직접 입력으로 충분히 쓸 수 있어요.</p></div></div>
            <div className="settings-layout">
              <article className="panel settings-panel">
                <div className="panel-heading"><div><h2>현재가를 가져오는 방법</h2><p>언제든 바꿀 수 있어요</p></div></div>
                <div className="mode-options">
                  <ModeOption active={settings.priceMode === "demo"} icon="✦" title="데모 가격" body="API 없이 기능을 먼저 체험해요" onClick={() => setSettings((value) => ({ ...value, priceMode: "demo" }))} recommended />
                  <ModeOption active={settings.priceMode === "manual"} icon="✎" title="직접 입력" body="내가 확인한 현재가를 적어요" onClick={() => setSettings((value) => ({ ...value, priceMode: "manual" }))} />
                  <ModeOption active={settings.priceMode === "api"} icon="⌁" title="외부 API" body="가격 제공 서비스와 연결해요" onClick={() => setSettings((value) => ({ ...value, priceMode: "api" }))} />
                </div>
                {settings.priceMode === "api" && <div className="api-form">
                  <div className="info-box"><span>i</span><p><strong>개발자용 연결 지점이에요</strong>주소의 <code>{"{ticker}"}</code> 부분을 종목코드로 바꾸어 요청해요. 실제 서비스에서는 API 키를 서버에서 안전하게 보관하세요.</p></div>
                  <label>API 요청 주소<input value={settings.apiUrl} onChange={(e) => setSettings((value) => ({ ...value, apiUrl: e.target.value }))} placeholder="https://example.com/quote/{ticker}" /></label>
                  <label>가격 응답 경로<input value={settings.pricePath} onChange={(e) => setSettings((value) => ({ ...value, pricePath: e.target.value }))} placeholder="data.price" /><small>예: 응답이 {`{ "data": { "price": 75000 } }`}라면 data.price</small></label>
                  <label>API 키 (선택)<input type="password" value={settings.apiKey} onChange={(e) => setSettings((value) => ({ ...value, apiKey: e.target.value }))} placeholder="이 기기에만 임시 저장" /></label>
                  <button className="primary-button" onClick={fetchLivePrices} disabled={loadingPrices}>{loadingPrices ? "연결 확인 중…" : "연결하고 가격 불러오기"}</button>
                </div>}
              </article>
              <aside className="settings-side">
                <article className="panel cash-panel"><span className="summary-icon mint">₩</span><h2>현금성 자산</h2><p>통장, 예금, 지갑 속 현금을 합쳐 적어주세요.</p><label><span>현재 금액</span><div className="money-input"><input inputMode="numeric" value={settings.cashBalance || ""} onChange={(e) => setSettings((value) => ({ ...value, cashBalance: Number(e.target.value.replace(/\D/g, "")) }))} /><b>원</b></div></label><small>자동으로 총자산에 더해져요.</small></article>
                <article className="panel privacy-panel"><span>🔒</span><h3>내 정보는 내 기기에</h3><p>증권계좌, 은행계좌와 연결하지 않으며 입력한 기록은 브라우저 안에 저장돼요.</p></article>
                <button className="reset-button" onClick={() => { if (window.confirm("모든 기록을 데모 상태로 되돌릴까요?")) resetDemo(); }}>데모 데이터로 초기화</button>
              </aside>
            </div>
          </section>
        )}

        <nav className="mobile-nav" aria-label="모바일 메뉴">
          <NavButton active={tab === "home"} icon="⌂" label="홈" onClick={() => setTab("home")} /><NavButton active={tab === "transactions"} icon="↕" label="기록" onClick={() => setTab("transactions")} /><button className="mobile-add" onClick={() => setModal("transaction")} aria-label="새 수입 지출 기록">＋</button><NavButton active={tab === "investments"} icon="↗" label="투자" onClick={() => setTab("investments")} /><NavButton active={tab === "settings"} icon="⚙" label="설정" onClick={() => setTab("settings")} />
        </nav>
      </main>

      {modal === "transaction" && <Modal title="수입 · 지출 기록" subtitle="오늘의 돈 흐름을 간단히 남겨보세요" onClose={() => setModal(null)}>
        <form onSubmit={addTransaction} className="modal-form">
          <div className="segmented-control"><button type="button" className={transactionType === "expense" ? "active expense" : ""} onClick={() => setTransactionType("expense")}>나간 돈</button><button type="button" className={transactionType === "income" ? "active income" : ""} onClick={() => setTransactionType("income")}>들어온 돈</button></div>
          <label>금액<div className="money-input large"><input name="amount" inputMode="numeric" required placeholder="0" /><b>원</b></div></label>
          <div className="form-row"><label>분류<select name="category" defaultValue={transactionType === "expense" ? "식비" : "월급"}>{transactionType === "expense" ? <><option>식비</option><option>주거</option><option>교통</option><option>쇼핑</option><option>건강</option><option>문화</option><option>기타</option></> : <><option>월급</option><option>용돈</option><option>부수입</option><option>이자</option><option>기타</option></>}</select></label><label>날짜<input name="date" type="date" defaultValue={today()} required /></label></div>
          <label>메모 <span className="optional">선택</span><input name="memo" placeholder="예: 점심 식사" /></label>
          <button className="primary-button submit-button" type="submit">기록 저장하기</button>
        </form>
      </Modal>}

      {modal === "stock" && <Modal title="주식 매수 내역 추가" subtitle="계좌 연결 없이, 기억할 내용만 적어요" onClose={() => setModal(null)}>
        <form onSubmit={addStock} className="modal-form">
          <div className="form-row"><label>증권사<input name="broker" required placeholder="예: 키움증권" /></label><label>매수일<input name="buyDate" type="date" defaultValue={today()} required /></label></div>
          <div className="form-row"><label>종목명<input name="name" required placeholder="예: 삼성전자" /></label><label>종목코드 / 티커<input name="ticker" required placeholder="005930 / AAPL" /></label></div>
          <div className="form-row"><label>주당 매수가<input name="buyPrice" inputMode="numeric" required placeholder="70,000" /></label><label>수량<input name="quantity" inputMode="decimal" required placeholder="10" /></label></div>
          <label>현재가 <span className="optional">선택</span><input name="currentPrice" inputMode="numeric" placeholder="비워두면 매수가로 시작해요" /></label>
          <div className="info-box compact"><span>i</span><p>나중에 종목 카드에서 현재가를 직접 바꾸거나 API로 불러올 수 있어요.</p></div>
          <button className="primary-button submit-button" type="submit">투자 내역 저장하기</button>
        </form>
      </Modal>}

      {toast && <div className="toast" role="status"><span>✓</span>{toast}</div>}
    </div>
  );
}

function NavButton({ active, icon, label, onClick }: { active: boolean; icon: string; label: string; onClick: () => void }) {
  return <button className={active ? "nav-button active" : "nav-button"} onClick={onClick}><span>{icon}</span>{label}</button>;
}

function SummaryCard({ icon, tone, label, value, note }: { icon: string; tone: string; label: string; value: number; note: string }) {
  return <article className="summary-card"><div><span className={`summary-icon ${tone}`}>{icon}</span><p>{label}</p></div><strong>{money.format(value)}</strong><small>{note}</small></article>;
}

function TransactionRow({ item, onDelete }: { item: Transaction; onDelete: () => void }) {
  const icons: Record<string, string> = { 월급: "₩", 주거: "⌂", 식비: "●", 교통: "◆", 쇼핑: "▣", 건강: "+", 문화: "♪" };
  return <div className="record-row"><span className={`record-icon ${item.type}`}>{icons[item.category] || "·"}</span><div className="record-main"><strong>{item.memo}</strong><small>{item.category} · {item.date.slice(5).replace("-", ".")}</small></div><strong className={item.type}>{item.type === "income" ? "+" : "−"}{money.format(item.amount)}</strong><button className="row-delete" onClick={onDelete} aria-label={`${item.memo} 삭제`}>×</button></div>;
}

function MiniStock({ stock }: { stock: Stock }) {
  const profit = (stock.currentPrice - stock.buyPrice) * stock.quantity;
  const rate = stock.buyPrice ? ((stock.currentPrice - stock.buyPrice) / stock.buyPrice) * 100 : 0;
  return <div className="mini-stock"><span className="stock-avatar">{stock.name.slice(0, 1)}</span><div><strong>{stock.name}</strong><small>{stock.broker} · {number.format(stock.quantity)}주</small></div><div><strong>{money.format(stock.currentPrice * stock.quantity)}</strong><small className={profit >= 0 ? "positive" : "negative"}>{profit >= 0 ? "+" : ""}{number.format(rate)}%</small></div></div>;
}

function Modal({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onClose]);
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button className="modal-close" onClick={onClose} aria-label="닫기">×</button><div className="modal-heading"><span className="brand-mark">ㅎ</span><div><h2 id="modal-title">{title}</h2><p>{subtitle}</p></div></div>{children}</section></div>;
}

function ModeOption({ active, icon, title, body, onClick, recommended = false }: { active: boolean; icon: string; title: string; body: string; onClick: () => void; recommended?: boolean }) {
  return <button className={active ? "mode-option active" : "mode-option"} onClick={onClick}><span className="mode-icon">{icon}</span><span><strong>{title}{recommended && <i>추천</i>}</strong><small>{body}</small></span><b className="radio-dot"></b></button>;
}

function EmptyState({ icon, title, body, action, onClick }: { icon: string; title: string; body: string; action: string; onClick: () => void }) {
  return <div className="empty-state"><span>{icon}</span><h3>{title}</h3><p>{body}</p><button onClick={onClick}>{action}</button></div>;
}

