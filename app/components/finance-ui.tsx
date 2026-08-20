"use client";

import { type FormEvent, type ReactNode, useEffect, useId, useRef } from "react";
import {
  money,
  number,
  parsePositiveNumber,
  today,
  type Stock,
  type Transaction,
  type TransactionType,
} from "../finance/model";

export function NavButton({ active, icon, label, onClick }: { active: boolean; icon: string; label: string; onClick: () => void }) {
  return <button className={active ? "nav-button active" : "nav-button"} onClick={onClick} aria-current={active ? "page" : undefined}><span className="nav-icon" aria-hidden="true">{icon}</span><span className="nav-label">{label}</span></button>;
}

export function SummaryCard({ icon, tone, label, value, note }: { icon: string; tone: string; label: string; value: number; note: string }) {
  return <article className="summary-card"><div><span className={`summary-icon ${tone}`}>{icon}</span><p>{label}</p></div><strong>{money.format(value)}</strong><small>{note}</small></article>;
}

export function TransactionRow({ item, onDelete }: { item: Transaction; onDelete: () => void }) {
  const icons: Record<string, string> = { 월급: "₩", 주거: "⌂", 식비: "●", 교통: "◆", 쇼핑: "▣", 건강: "+", 문화: "♪" };
  return <div className="record-row"><span className={`record-icon ${item.type}`}>{icons[item.category] || "·"}</span><div className="record-main"><strong>{item.memo}</strong><small>{item.category} · {item.date.slice(5).replace("-", ".")}</small></div><strong className={item.type}>{item.type === "income" ? "+" : "−"}{money.format(item.amount)}</strong><button className="row-delete" onClick={onDelete} aria-label={`${item.memo} 삭제`}>×</button></div>;
}

export function MiniStock({ stock }: { stock: Stock }) {
  const profit = (stock.currentPrice - stock.buyPrice) * stock.quantity;
  const rate = stock.buyPrice ? ((stock.currentPrice - stock.buyPrice) / stock.buyPrice) * 100 : 0;
  return <div className="mini-stock"><span className="stock-avatar">{stock.name.slice(0, 1)}</span><div><strong>{stock.name}</strong><small>{stock.broker} · {number.format(stock.quantity)}주</small></div><div><strong>{money.format(stock.currentPrice * stock.quantity)}</strong><small className={profit >= 0 ? "positive" : "negative"}>{profit >= 0 ? "+" : ""}{number.format(rate)}%</small></div></div>;
}

export function ModeOption({ active, icon, title, body, onClick, recommended = false }: { active: boolean; icon: string; title: string; body: string; onClick: () => void; recommended?: boolean }) {
  return <button className={active ? "mode-option active" : "mode-option"} onClick={onClick}><span className="mode-icon">{icon}</span><span><strong>{title}{recommended && <i>추천</i>}</strong><small>{body}</small></span><b className="radio-dot"></b></button>;
}

export function EmptyState({ icon, title, body, action, onClick }: { icon: string; title: string; body: string; action: string; onClick: () => void }) {
  return <div className="empty-state"><span>{icon}</span><h3>{title}</h3><p>{body}</p><button onClick={onClick}>{action}</button></div>;
}

export function Modal({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: ReactNode }) {
  const titleId = useId();
  const modalRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !modalRef.current) return;
      const focusable = [...modalRef.current.querySelectorAll<HTMLElement>("button, input, select, textarea, [href], [tabindex]:not([tabindex='-1'])")]
        .filter((element) => !element.hasAttribute("disabled"));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", close);
    return () => {
      window.removeEventListener("keydown", close);
      previousFocus?.focus();
    };
  }, [onClose]);

  return <div className="modal-backdrop"><button type="button" className="modal-scrim" onClick={onClose} aria-label="모달 닫기"></button><section ref={modalRef} className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId}><button ref={closeButtonRef} className="modal-close" onClick={onClose} aria-label="닫기">×</button><div className="modal-heading"><span className="brand-mark">ㅎ</span><div><h2 id={titleId}>{title}</h2><p>{subtitle}</p></div></div>{children}</section></div>;
}

export function TransactionModal({ transactionType, setTransactionType, onClose, onAdd }: {
  transactionType: TransactionType;
  setTransactionType: (value: TransactionType) => void;
  onClose: () => void;
  onAdd: (transaction: Omit<Transaction, "id">) => void;
}) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const amount = parsePositiveNumber(form.get("amount"));
    if (!amount) return;
    const category = String(form.get("category"));
    onAdd({
      type: transactionType,
      amount,
      category,
      memo: String(form.get("memo") || category),
      date: String(form.get("date")),
    });
  }

  return <Modal title="수입 · 지출 기록" subtitle="오늘의 돈 흐름을 간단히 남겨보세요" onClose={onClose}>
    <form onSubmit={submit} className="modal-form">
      <div className="segmented-control"><button type="button" className={transactionType === "expense" ? "active expense" : ""} onClick={() => setTransactionType("expense")}>나간 돈</button><button type="button" className={transactionType === "income" ? "active income" : ""} onClick={() => setTransactionType("income")}>들어온 돈</button></div>
      <label>금액<div className="money-input large"><input name="amount" inputMode="numeric" required placeholder="0" pattern="[0-9, ]+" /><b>원</b></div></label>
      <div className="form-row"><label>분류<select key={transactionType} name="category" defaultValue={transactionType === "expense" ? "식비" : "월급"}>{transactionType === "expense" ? <><option>식비</option><option>주거</option><option>교통</option><option>쇼핑</option><option>건강</option><option>문화</option><option>기타</option></> : <><option>월급</option><option>용돈</option><option>부수입</option><option>이자</option><option>기타</option></>}</select></label><label>날짜<input name="date" type="date" defaultValue={today()} required /></label></div>
      <label>메모 <span className="optional">선택</span><input name="memo" placeholder="예: 점심 식사" /></label>
      <button className="primary-button submit-button" type="submit">기록 저장하기</button>
    </form>
  </Modal>;
}

export function StockModal({ onClose, onAdd }: {
  onClose: () => void;
  onAdd: (stock: Omit<Stock, "id" | "priceSource" | "updatedAt">) => void;
}) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const buyPrice = parsePositiveNumber(form.get("buyPrice"));
    const quantity = parsePositiveNumber(form.get("quantity"));
    const currentPrice = parsePositiveNumber(form.get("currentPrice")) ?? buyPrice;
    if (!buyPrice || !quantity || !currentPrice) return;
    onAdd({
      broker: String(form.get("broker")),
      name: String(form.get("name")),
      ticker: String(form.get("ticker")).trim().toUpperCase(),
      buyDate: String(form.get("buyDate")),
      buyPrice,
      quantity,
      currentPrice,
    });
  }

  return <Modal title="주식 매수 내역 추가" subtitle="계좌 연결 없이, 기억할 내용만 적어요" onClose={onClose}>
    <form onSubmit={submit} className="modal-form">
      <div className="form-row"><label>증권사<input name="broker" required placeholder="예: 키움증권" /></label><label>매수일<input name="buyDate" type="date" defaultValue={today()} required /></label></div>
      <div className="form-row"><label>종목명<input name="name" required placeholder="예: 삼성전자" /></label><label>종목코드 / 티커<input name="ticker" required placeholder="005930 / AAPL" /></label></div>
      <div className="form-row"><label>주당 매수가<input name="buyPrice" inputMode="numeric" required placeholder="70,000" pattern="[0-9, ]+" /></label><label>수량<input name="quantity" inputMode="decimal" required placeholder="10" /></label></div>
      <label>현재가 <span className="optional">선택</span><input name="currentPrice" inputMode="numeric" placeholder="비워두면 매수가로 시작해요" pattern="[0-9, ]*" /></label>
      <div className="info-box compact"><span>i</span><p>나중에 종목 카드에서 현재가를 직접 바꾸거나 API로 불러올 수 있어요.</p></div>
      <button className="primary-button submit-button" type="submit">투자 내역 저장하기</button>
    </form>
  </Modal>;
}
