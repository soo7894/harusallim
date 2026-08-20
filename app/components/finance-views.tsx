"use client";

import type { User } from "firebase/auth";
import type { Dispatch, SetStateAction } from "react";
import {
  money,
  monthKey,
  number,
  sourceLabel,
  type FinanceSummary,
  type Settings,
  type Stock,
  type Transaction,
} from "../finance/model";
import type { SyncState } from "../hooks/use-finance-data";
import { EmptyState, MiniStock, ModeOption, SummaryCard, TransactionRow } from "./finance-ui";

export function HomeView({ summary, settings, stocks, latestTransactions, loadingPrices, onOpenStock, onOpenTransaction, onOpenTransactions, onOpenInvestments, onDeleteTransaction, onRefreshPrices }: {
  summary: FinanceSummary;
  settings: Settings;
  stocks: Stock[];
  latestTransactions: Transaction[];
  loadingPrices: boolean;
  onOpenStock: () => void;
  onOpenTransaction: () => void;
  onOpenTransactions: () => void;
  onOpenInvestments: () => void;
  onDeleteTransaction: (id: string) => void;
  onRefreshPrices: () => void;
}) {
  const currentMonth = Number(monthKey().slice(5));
  return <>
    <section className="page-heading home-heading">
      <div><p className="eyebrow">{currentMonth}월의 살림</p><h1>안녕하세요!<br /><em>내 돈의 오늘</em>을 살펴볼까요?</h1></div>
      <div className="header-actions"><button className="secondary-button" onClick={onOpenStock}><span>↗</span> 주식 추가</button><button className="primary-button" onClick={onOpenTransaction}><span>＋</span> 수입 · 지출 기록</button></div>
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
      <div className="section-title"><div><span className="section-icon peach">▤</span><div><h2>이번 달 한눈에 보기</h2><p>들어오고, 쓰고, 투자한 돈이에요</p></div></div><span className="month-badge">{currentMonth}월</span></div>
      <div className="summary-grid">
        <SummaryCard icon="↓" tone="mint" label="들어온 돈" value={summary.income} note="이번 달 수입" />
        <SummaryCard icon="↑" tone="peach" label="나간 돈" value={summary.expense} note="이번 달 지출" />
        <SummaryCard icon="↗" tone="lavender" label="투자한 돈" value={summary.investment} note="이번 달 매수 금액" />
        <article className="summary-card balance-card"><div><span className="summary-icon cream">♥</span><p>남은 돈</p></div><strong>{money.format(summary.income - summary.expense - summary.investment)}</strong><small>수입 − 지출 − 투자</small></article>
      </div>
    </section>

    <section className="dashboard-grid">
      <article className="panel transaction-panel">
        <div className="panel-heading"><div><h2>최근 기록</h2><p>가장 최근 수입과 지출이에요</p></div><button className="text-button" onClick={onOpenTransactions}>전체 보기 →</button></div>
        <div className="record-list">{latestTransactions.map((item) => <TransactionRow key={item.id} item={item} onDelete={() => onDeleteTransaction(item.id)} />)}</div>
        <button className="wide-dashed-button" onClick={onOpenTransaction}>＋ 새 기록 남기기</button>
      </article>

      <article className="panel investment-preview">
        <div className="panel-heading"><div><h2>나의 투자</h2><p>지금 얼마나 자랐을까요?</p></div><button className="text-button" onClick={onOpenInvestments}>자세히 →</button></div>
        <div className="investment-total"><div><span>주식 평가액</span><strong>{money.format(summary.valuation)}</strong></div><span className={summary.profit >= 0 ? "gain-badge" : "loss-badge"}>{summary.profit >= 0 ? "+" : ""}{number.format(summary.returnRate)}%</span></div>
        <div className="portfolio-bar"><span style={{ width: `${Math.max(8, Math.min(100, (summary.valuation / Math.max(summary.total, 1)) * 100))}%` }}></span></div>
        <div className="portfolio-legend"><span><i></i>주식 {number.format((summary.valuation / Math.max(summary.total, 1)) * 100)}%</span><span>전체 자산 중</span></div>
        <div className="mini-stock-list">{stocks.slice(0, 2).map((stock) => <MiniStock key={stock.id} stock={stock} />)}</div>
        <button className="price-update" onClick={onRefreshPrices} disabled={loadingPrices}>{loadingPrices ? "가격을 확인하는 중…" : "↻ 현재가 새로고침"}</button>
        <p className="price-footnote">{settings.priceMode === "demo" ? "지금은 데모 가격으로 보여드려요" : "현재가는 직접 입력하는 방식이에요"}</p>
      </article>
    </section>

    <section className="tip-card"><span className="tip-illustration">💡</span><div><strong>오늘의 돈 습관</strong><p>작은 지출도 그날 기록하면 한 달 뒤 내 소비 흐름이 또렷하게 보여요.</p></div><button onClick={onOpenTransaction}>지금 기록하기</button></section>
  </>;
}

export function TransactionsView({ transactions, summary, onOpenTransaction, onDeleteTransaction }: {
  transactions: Transaction[];
  summary: FinanceSummary;
  onOpenTransaction: () => void;
  onDeleteTransaction: (id: string) => void;
}) {
  const sorted = [...transactions].sort((a, b) => b.date.localeCompare(a.date));
  return <section className="subpage">
    <div className="page-heading"><div><p className="eyebrow">차곡차곡 기록해요</p><h1>수입 · 지출</h1><p className="heading-description">돈이 들어오고 나간 순간을 가볍게 적어보세요.</p></div><button className="primary-button" onClick={onOpenTransaction}>＋ 새 기록</button></div>
    <div className="summary-grid compact"><SummaryCard icon="↓" tone="mint" label="이번 달 수입" value={summary.income} note="들어온 돈" /><SummaryCard icon="↑" tone="peach" label="이번 달 지출" value={summary.expense} note="나간 돈" /><SummaryCard icon="=" tone="lavender" label="이번 달 잔액" value={summary.income - summary.expense} note="수입 − 지출" /></div>
    <article className="panel table-panel">
      <div className="panel-heading"><div><h2>전체 기록</h2><p>최근 날짜 순으로 보여드려요</p></div><span className="count-badge">{transactions.length}건</span></div>
      <div className="record-list roomy">{sorted.map((item) => <TransactionRow key={item.id} item={item} onDelete={() => onDeleteTransaction(item.id)} />)}</div>
      {!transactions.length && <EmptyState icon="📝" title="아직 기록이 없어요" body="첫 수입이나 지출을 남겨보세요." action="첫 기록 남기기" onClick={onOpenTransaction} />}
    </article>
  </section>;
}

export function InvestmentsView({ stocks, settings, summary, editingPrice, priceDraft, loadingPrices, onSetPriceDraft, onStartEditing, onCancelEditing, onSavePrice, onDeleteStock, onOpenStock, onRefreshPrices, onOpenSettings }: {
  stocks: Stock[];
  settings: Settings;
  summary: FinanceSummary;
  editingPrice: string | null;
  priceDraft: string;
  loadingPrices: boolean;
  onSetPriceDraft: (value: string) => void;
  onStartEditing: (stock: Stock) => void;
  onCancelEditing: () => void;
  onSavePrice: (id: string) => void;
  onDeleteStock: (stock: Stock) => void;
  onOpenStock: () => void;
  onRefreshPrices: () => void;
  onOpenSettings: () => void;
}) {
  return <section className="subpage">
    <div className="page-heading"><div><p className="eyebrow">계좌 연결은 필요 없어요</p><h1>나의 투자</h1><p className="heading-description">매수 내역은 직접, 현재 가격은 원하는 방식으로 관리해요.</p></div><div className="header-actions"><button className="secondary-button" onClick={onRefreshPrices} disabled={loadingPrices}>↻ 현재가 갱신</button><button className="primary-button" onClick={onOpenStock}>＋ 주식 추가</button></div></div>
    <div className="investment-summary">
      <div><span>투자 원금</span><strong>{money.format(summary.principal)}</strong></div><div><span>현재 평가액</span><strong>{money.format(summary.valuation)}</strong></div><div><span>평가 손익</span><strong className={summary.profit >= 0 ? "positive" : "negative"}>{summary.profit >= 0 ? "+" : ""}{money.format(summary.profit)}</strong></div><div><span>수익률</span><strong className={summary.profit >= 0 ? "positive" : "negative"}>{summary.profit >= 0 ? "+" : ""}{number.format(summary.returnRate)}%</strong></div>
    </div>
    <div className="mode-notice"><span className={`mode-dot ${settings.priceMode}`}></span><p><strong>{settings.priceMode === "demo" ? "데모 가격 사용 중" : "수동 가격 사용 중"}</strong>{settings.priceMode === "demo" ? "API 키가 없어도 모든 계산을 체험할 수 있어요." : "종목별로 현재가를 직접 바꿀 수 있어요."}</p><button onClick={onOpenSettings}>방식 바꾸기</button></div>
    <div className="stock-grid">
      {stocks.map((stock) => {
        const principal = stock.buyPrice * stock.quantity;
        const valuation = stock.currentPrice * stock.quantity;
        const profit = valuation - principal;
        const rate = principal ? (profit / principal) * 100 : 0;
        return <article className="stock-card" key={stock.id}>
          <div className="stock-card-top"><div className="stock-avatar">{stock.name.slice(0, 1)}</div><div><h3>{stock.name}</h3><p>{stock.ticker} · {stock.broker}</p></div><button className="more-button" aria-label={`${stock.name} 삭제`} onClick={() => onDeleteStock(stock)}>×</button></div>
          <dl className="stock-metrics"><div><dt>보유 수량</dt><dd>{number.format(stock.quantity)}주</dd></div><div><dt>평균 매수가</dt><dd>{money.format(stock.buyPrice)}</dd></div><div><dt>{/^\d{6}$/.test(stock.ticker) && stock.priceSource === "api" ? "최근 종가" : "현재가"}</dt><dd>{money.format(stock.currentPrice)}</dd></div><div><dt>평가 금액</dt><dd>{money.format(valuation)}</dd></div></dl>
          <div className="stock-profit"><span>평가손익</span><strong className={profit >= 0 ? "positive" : "negative"}>{profit >= 0 ? "+" : ""}{money.format(profit)} <small>({profit >= 0 ? "+" : ""}{number.format(rate)}%)</small></strong></div>
          {editingPrice === stock.id ? <div className="inline-price"><label><span className="sr-only">새 현재가</span><input inputMode="numeric" value={priceDraft} onChange={(event) => onSetPriceDraft(event.target.value)} placeholder="새 현재가" /></label><button onClick={() => onSavePrice(stock.id)}>저장</button><button className="cancel" onClick={onCancelEditing}>취소</button></div> : <div className="stock-card-bottom"><span className={`source-chip ${stock.priceSource}`}>{sourceLabel[stock.priceSource]} · {stock.updatedAt}</span><button onClick={() => onStartEditing(stock)}>가격 수정</button></div>}
        </article>;
      })}
      {!stocks.length && <EmptyState icon="🌱" title="아직 담은 주식이 없어요" body="계좌 연결 없이 매수 내역만 적으면 돼요." action="첫 주식 추가하기" onClick={onOpenStock} />}
    </div>
  </section>;
}

export function SettingsView({ user, displayName, settings, setSettings, syncState, syncLabel, onLogout, onResetDemo }: {
  user: User;
  displayName: string;
  settings: Settings;
  setSettings: Dispatch<SetStateAction<Settings>>;
  syncState: SyncState;
  syncLabel: string;
  onLogout: () => void;
  onResetDemo: () => void;
}) {
  return <section className="subpage settings-page">
    <div className="page-heading"><div><p className="eyebrow">무료로 오래 사용할 수 있게</p><h1>가격 설정</h1><p className="heading-description">데모 가격을 쓰거나 확인한 현재가를 직접 입력할 수 있어요.</p></div></div>
    <div className="settings-layout">
      <article className="panel settings-panel">
        <div className="panel-heading"><div><h2>현재가를 가져오는 방법</h2><p>언제든 바꿀 수 있어요</p></div></div>
        <div className="mode-options">
          <ModeOption active={settings.priceMode === "demo"} icon="✦" title="데모 가격" body="기능을 먼저 체험할 때 사용해요" onClick={() => setSettings((value) => ({ ...value, priceMode: "demo" }))} />
          <ModeOption active={settings.priceMode === "manual"} icon="✎" title="직접 입력" body="내가 확인한 현재가를 적어요" onClick={() => setSettings((value) => ({ ...value, priceMode: "manual" }))} />
        </div>
        <p className="provider-footnote">GitHub Pages 무료 배포에서는 비밀 API 키를 안전하게 보관할 서버가 없어 자동 시세 조회를 제공하지 않아요.</p>
      </article>
      <aside className="settings-side">
        <article className="panel cash-panel"><span className="summary-icon mint">₩</span><h2>현금성 자산</h2><p>통장, 예금, 지갑 속 현금을 합쳐 적어주세요.</p><label><span>현재 금액</span><div className="money-input"><input inputMode="numeric" value={settings.cashBalance || ""} onChange={(event) => setSettings((value) => ({ ...value, cashBalance: Number(event.target.value.replace(/\D/g, "")) }))} /><b>원</b></div></label><small>자동으로 총자산에 더해져요.</small></article>
        <article className="panel privacy-panel"><span>☁️</span><h3>내 계정에 자동 저장</h3><p>입력한 기록은 로그인한 계정에만 저장돼요. 증권계좌나 은행계좌는 연결하지 않아요.</p><small className={`sync-status ${syncState}`}>{syncLabel}</small></article>
        <article className="panel account-panel"><span className="account-avatar">{displayName.slice(0, 1)}</span><div><strong>{displayName}</strong><small>{user.email}</small></div><button onClick={onLogout}>로그아웃</button></article>
        <button className="reset-button" onClick={onResetDemo}>데모 데이터로 초기화</button>
      </aside>
    </div>
  </section>;
}
