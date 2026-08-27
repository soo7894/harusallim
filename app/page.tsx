"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { HomeView, InvestmentsView, SettingsView, TransactionsView } from "./components/finance-views";
import { NavButton, StockModal, TransactionModal } from "./components/finance-ui";
import { createId, parsePositiveNumber, type Stock, type Tab, type Transaction, type TransactionType } from "./finance/model";
import { useFinanceData } from "./hooks/use-finance-data";
import { useHydrated } from "./hooks/use-hydrated";
import { useStockPrices } from "./hooks/use-stock-prices";
import { useFirebaseAuth } from "./hooks/use-firebase-auth";

export default function Home() {
  const hydrated = useHydrated();
  const auth = useFirebaseAuth();
  const finance = useFinanceData(auth.db, auth.user);
  const [guestMode, setGuestMode] = useState(false);
  const isGuest = guestMode && !auth.user;
  const [tab, setTab] = useState<Tab>("home");
  const [modal, setModal] = useState<"transaction" | "stock" | null>(null);
  const [transactionType, setTransactionType] = useState<TransactionType>("expense");
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [priceDraft, setPriceDraft] = useState("");
  const [toast, setToast] = useState("");

  const showNotice = useCallback((message: string) => setToast(message), []);
  const prices = useStockPrices(finance.setStocks, finance.settings, showNotice);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2_800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!finance.notice) return;
    const timer = window.setTimeout(finance.clearNotice, 4_500);
    return () => window.clearTimeout(timer);
  }, [finance.notice, finance.clearNotice]);

  function startGuestMode() {
    finance.resetDemo();
    setGuestMode(true);
    setTab("home");
  }

  const latestTransactions = useMemo(
    () => [...finance.transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5),
    [finance.transactions],
  );

  function addTransaction(transaction: Omit<Transaction, "id">) {
    finance.setTransactions((items) => [...items, { ...transaction, id: createId() }]);
    setModal(null);
    showNotice(`${transaction.type === "income" ? "수입" : "지출"}을 기록했어요`);
  }

  function addStock(stock: Omit<Stock, "id" | "priceSource" | "updatedAt">) {
    finance.setStocks((items) => [...items, { ...stock, id: createId(), priceSource: "manual", updatedAt: "방금 입력" }]);
    setModal(null);
    showNotice("주식 매수 내역을 추가했어요");
  }

  function saveManualPrice(id: string) {
    const currentPrice = parsePositiveNumber(priceDraft);
    if (!currentPrice) return;
    finance.setStocks((items) => items.map((item) => item.id === id
      ? { ...item, currentPrice, priceSource: "manual", updatedAt: "방금 수정" }
      : item));
    setEditingPrice(null);
    showNotice("현재가를 반영했어요");
  }

  function deleteStock(stock: Stock) {
    if (!window.confirm(`${stock.name} 내역을 삭제할까요?`)) return;
    finance.setStocks((items) => items.filter((item) => item.id !== stock.id));
  }

  function resetDemo() {
    if (!window.confirm("모든 기록을 데모 상태로 되돌릴까요?")) return;
    finance.resetDemo();
    showNotice("처음 데모 상태로 돌아왔어요");
  }

  const blockingStorageError = auth.error && !auth.db
    ? auth.error
    : auth.user && finance.error && !finance.cloudReady ? finance.error : "";

  if (!hydrated || !auth.ready || (auth.user && !finance.cloudReady && !finance.error)) {
    return <main className="loading-screen"><div className="brand-mark">ㅎ</div><p>내 살림을 불러오는 중이에요</p></main>;
  }

  if (blockingStorageError) {
    return <main className="auth-screen">
      <section className="auth-card" aria-labelledby="auth-error-title">
        <div className="brand-mark">ㅎ</div>
        <p className="auth-eyebrow">하루살림</p>
        <h1 id="auth-error-title">로그인 저장소를<br />연결하는 중이에요</h1>
        <p>{blockingStorageError}</p>
        <button className="secondary-button" onClick={() => window.location.reload()}>다시 확인하기</button>
      </section>
    </main>;
  }

  if (!auth.user && !isGuest) {
    return <main className="auth-screen">
      <section className="auth-card" aria-labelledby="login-title">
        <div className="auth-brand"><span className="brand-mark">ㅎ</span><strong>하루살림</strong></div>
        <p className="auth-eyebrow">내 돈 기록을 안전하게 이어서</p>
        <h1 id="login-title">구글 계정으로<br />내 살림을 보관해요</h1>
        <p>수입·지출과 투자 내역을 내 계정에 저장하고, 다른 기기에서도 그대로 이어볼 수 있어요.</p>
        <button className="google-login-button" onClick={() => void auth.loginWithGoogle()} disabled={auth.busy}>
          <span aria-hidden="true">G</span>{auth.busy ? "구글로 이동하는 중…" : "Google 계정으로 계속하기"}
        </button>
        <div className="auth-divider"><span>또는</span></div>
        <button className="guest-login-button" onClick={startGuestMode}>로그인 없이 둘러보기</button>
        <p className="guest-login-note">샘플 데이터로 자유롭게 체험해 보세요. 입력한 내용은 저장되지 않아요.</p>
        {auth.error && <p className="auth-error" role="alert">{auth.error}</p>}
        <div className="auth-safety"><span>🔒</span><p><strong>계정마다 따로 보관돼요</strong>다른 사용자는 내 가계정보를 볼 수 없어요.</p></div>
      </section>
    </main>;
  }

  const user = auth.user;
  const displayName = isGuest ? "둘러보기" : String(user?.displayName || user?.email?.split("@")[0] || "나");
  const syncLabel = isGuest ? "저장되지 않는 체험 모드" : finance.syncState === "saving" ? "저장하는 중…" : finance.syncState === "error" ? "저장 확인 필요" : "온라인 저장 완료";
  const visibleToast = toast || finance.notice;

  return <div className="app-shell">
    <aside className="sidebar">
      <button className="brand" onClick={() => setTab("home")} aria-label="하루살림 홈">
        <span className="brand-mark">ㅎ</span>
        <span><strong>하루살림</strong><small>쉬운 돈 관리</small></span>
      </button>
      <nav aria-label="주요 메뉴">
        <NavButton active={tab === "home"} icon="⌂" label="홈" onClick={() => setTab("home")} />
        <NavButton active={tab === "transactions"} icon="⇅" label="수입 · 지출" onClick={() => setTab("transactions")} />
        <NavButton active={tab === "investments"} icon="↗" label="투자" onClick={() => setTab("investments")} />
        <NavButton active={tab === "settings"} icon="⚙" label="설정" onClick={() => setTab("settings")} />
      </nav>
      <div className="sidebar-note"><span>{isGuest ? "👀" : "🔒"}</span><p><strong>{isGuest ? "편하게 둘러보세요" : "내 계정에 안전하게"}</strong>{isGuest ? "샘플 데이터이며 변경 내용은 저장되지 않아요." : "입력한 내용은 구글 계정별로 따로 저장돼요."}</p></div>
      <div className="profile-chip"><span>{displayName.slice(0, 1)}</span><div><strong>{displayName}</strong><small>{syncLabel}</small></div><button className="signout-button" onClick={() => isGuest ? setGuestMode(false) : void auth.logout()}>{isGuest ? "나가기" : "로그아웃"}</button></div>
    </aside>

    <main className="main-content">
      <header className="mobile-header">
        <button className="brand" onClick={() => setTab("home")}><span className="brand-mark">ㅎ</span><strong>하루살림</strong></button>
        <button className="icon-button user-initial" onClick={() => setTab("settings")} aria-label="내 계정과 설정">{displayName.slice(0, 1)}</button>
      </header>

      {isGuest && <aside className="guest-banner" role="status"><div><strong>👀 로그인 없이 둘러보는 중</strong><span>샘플 데이터로 체험 중이며 변경 내용은 저장되지 않아요.</span></div><button onClick={() => void auth.loginWithGoogle()}>Google 로그인하고 저장하기</button></aside>}

      {tab === "home" && <HomeView
        summary={finance.summary}
        settings={finance.settings}
        stocks={finance.stocks}
        latestTransactions={latestTransactions}
        loadingPrices={prices.loadingPrices}
        onOpenStock={() => setModal("stock")}
        onOpenTransaction={() => setModal("transaction")}
        onOpenTransactions={() => setTab("transactions")}
        onOpenInvestments={() => setTab("investments")}
        onDeleteTransaction={(id) => finance.setTransactions((items) => items.filter((item) => item.id !== id))}
        onRefreshPrices={() => void prices.fetchLivePrices()}
      />}

      {tab === "transactions" && <TransactionsView
        transactions={finance.transactions}
        summary={finance.summary}
        onOpenTransaction={() => setModal("transaction")}
        onDeleteTransaction={(id) => finance.setTransactions((items) => items.filter((item) => item.id !== id))}
      />}

      {tab === "investments" && <InvestmentsView
        stocks={finance.stocks}
        settings={finance.settings}
        summary={finance.summary}
        editingPrice={editingPrice}
        priceDraft={priceDraft}
        loadingPrices={prices.loadingPrices}
        onSetPriceDraft={setPriceDraft}
        onStartEditing={(stock) => { setEditingPrice(stock.id); setPriceDraft(String(stock.currentPrice)); }}
        onCancelEditing={() => setEditingPrice(null)}
        onSavePrice={saveManualPrice}
        onDeleteStock={deleteStock}
        onOpenStock={() => setModal("stock")}
        onRefreshPrices={() => void prices.fetchLivePrices()}
        onOpenSettings={() => setTab("settings")}
      />}

      {tab === "settings" && <SettingsView
        user={user}
        isGuest={isGuest}
        displayName={displayName}
        settings={finance.settings}
        setSettings={finance.setSettings}
        syncState={finance.syncState}
        syncLabel={syncLabel}
        onLogout={() => isGuest ? setGuestMode(false) : void auth.logout()}
        onResetDemo={resetDemo}
      />}

      <nav className="mobile-nav" aria-label="모바일 메뉴">
        <NavButton active={tab === "home"} icon="⌂" label="홈" onClick={() => setTab("home")} />
        <NavButton active={tab === "transactions"} icon="⇅" label="수입지출" onClick={() => setTab("transactions")} />
        <button className="mobile-add" onClick={() => setModal("transaction")} aria-label="새 수입 지출 기록"><span aria-hidden="true">＋</span><small>추가</small></button>
        <NavButton active={tab === "investments"} icon="↗" label="투자" onClick={() => setTab("investments")} />
        <NavButton active={tab === "settings"} icon="⚙" label="설정" onClick={() => setTab("settings")} />
      </nav>
    </main>

    {modal === "transaction" && <TransactionModal transactionType={transactionType} setTransactionType={setTransactionType} onClose={() => setModal(null)} onAdd={addTransaction} />}
    {modal === "stock" && <StockModal onClose={() => setModal(null)} onAdd={addStock} />}
    {visibleToast && <div className="toast" role="status"><span>✓</span>{visibleToast}</div>}
  </div>;
}
