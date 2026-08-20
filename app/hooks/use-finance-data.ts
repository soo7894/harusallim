"use client";

import type { User } from "firebase/auth";
import { doc, getDoc, runTransaction, serverTimestamp, type Firestore } from "firebase/firestore";
import { type Dispatch, type SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  blankSettings,
  calculateSummary,
  defaultSettings,
  legacyStorageKeys,
  makeDemoData,
  migrationOwnerKey,
  normalizeFinanceData,
  readLegacyFinanceData,
  type FinanceData,
  type Settings,
  type Stock,
  type Transaction,
} from "../finance/model";

export type SyncState = "loading" | "saving" | "saved" | "error";

type FinanceDocument = {
  data?: unknown;
  revision?: unknown;
};

class FinanceConflictError extends Error {
  constructor() {
    super("finance_data_conflict");
  }
}

const emptyData = (): FinanceData => ({ transactions: [], stocks: [], settings: { ...blankSettings } });

function fingerprint(data: FinanceData) {
  return JSON.stringify(data);
}

function readRevision(value: unknown) {
  return Number.isSafeInteger(value) && Number(value) >= 0 ? Number(value) : 0;
}

export function useFinanceData(db: Firestore | null, user: User | null) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [settings, setSettings] = useState<Settings>(blankSettings);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<SyncState>("loading");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const revisionRef = useRef(0);
  const lastSavedRef = useRef("");
  const saveQueueRef = useRef(Promise.resolve());
  const queueEpochRef = useRef(0);
  const mountedRef = useRef(true);
  const currentUserIdRef = useRef<string | null>(null);

  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  useEffect(() => {
    currentUserIdRef.current = user?.uid ?? null;
    if (!user) queueEpochRef.current += 1;
  }, [user]);

  useEffect(() => {
    if (!db || !user) return;
    const currentDb = db;
    const currentUser = user;
    let active = true;
    const epoch = queueEpochRef.current + 1;
    queueEpochRef.current = epoch;
    const documentRef = doc(currentDb, "users", currentUser.uid);

    async function loadCloudData() {
      const fallback = emptyData();
      try {
        const initial = await getDoc(documentRef);
        let nextData: FinanceData;
        let revision = 0;

        if (initial.exists()) {
          const cloud = initial.data() as FinanceDocument;
          nextData = normalizeFinanceData(cloud.data, fallback);
          revision = readRevision(cloud.revision);
        } else {
          const legacy = readLegacyFinanceData();
          const migrationOwner = localStorage.getItem(migrationOwnerKey);
          const shouldImportLegacy = legacy.hasLegacyData && !migrationOwner;
          nextData = shouldImportLegacy ? normalizeFinanceData(legacy.data, fallback) : fallback;

          const concurrent = await runTransaction<FinanceDocument | null>(currentDb, async (transaction) => {
            const current = await transaction.get(documentRef);
            if (current.exists()) return current.data() as FinanceDocument;
            transaction.set(documentRef, { data: nextData, revision: 0, updatedAt: serverTimestamp() });
            return null;
          });

          if (concurrent) {
            nextData = normalizeFinanceData(concurrent.data, fallback);
            revision = readRevision(concurrent.revision);
          } else if (shouldImportLegacy) {
            localStorage.setItem(migrationOwnerKey, currentUser.uid);
            legacyStorageKeys.forEach((key) => localStorage.removeItem(key));
          }
        }

        if (!active || epoch !== queueEpochRef.current) return;
        revisionRef.current = revision;
        lastSavedRef.current = fingerprint(nextData);
        setTransactions(nextData.transactions);
        setStocks(nextData.stocks);
        setSettings(nextData.settings);
        setOwnerId(currentUser.uid);
        setSyncState("saved");
        setError("");
      } catch (caught) {
        if (!active) return;
        setError(caught instanceof Error ? `저장된 정보를 불러오지 못했어요: ${caught.message}` : "저장된 정보를 불러오지 못했어요.");
        setSyncState("error");
      }
    }

    void loadCloudData();
    return () => {
      active = false;
    };
  }, [db, user]);

  const cloudReady = Boolean(user && ownerId === user.uid);

  useEffect(() => {
    if (!db || !user || !cloudReady) return;
    const snapshot = { transactions, stocks, settings };
    const nextFingerprint = fingerprint(snapshot);
    if (nextFingerprint === lastSavedRef.current) return;
    const userId = user.uid;
    const epoch = queueEpochRef.current;
    const documentRef = doc(db, "users", userId);

    const timer = window.setTimeout(() => {
      setSyncState("saving");
      saveQueueRef.current = saveQueueRef.current.then(async () => {
        if (!mountedRef.current || epoch !== queueEpochRef.current || currentUserIdRef.current !== userId) return;
        if (nextFingerprint === lastSavedRef.current) return;

        try {
          const nextRevision = await runTransaction(db, async (transaction) => {
            const current = await transaction.get(documentRef);
            const currentRevision = current.exists() ? readRevision(current.data().revision) : 0;
            if (currentRevision !== revisionRef.current) throw new FinanceConflictError();
            const revision = currentRevision + 1;
            transaction.set(documentRef, { data: snapshot, revision, updatedAt: serverTimestamp() });
            return revision;
          });

          if (!mountedRef.current || epoch !== queueEpochRef.current || currentUserIdRef.current !== userId) return;
          revisionRef.current = nextRevision;
          lastSavedRef.current = nextFingerprint;
          setSyncState("saved");
          setError("");
        } catch (caught) {
          if (!(caught instanceof FinanceConflictError)) throw caught;
          queueEpochRef.current += 1;
          const latest = await getDoc(documentRef);
          if (!latest.exists()) throw caught;
          const latestDocument = latest.data() as FinanceDocument;
          const latestData = normalizeFinanceData(latestDocument.data, emptyData());
          revisionRef.current = readRevision(latestDocument.revision);
          lastSavedRef.current = fingerprint(latestData);
          setTransactions(latestData.transactions);
          setStocks(latestData.stocks);
          setSettings(latestData.settings);
          setOwnerId(userId);
          setSyncState("saved");
          setNotice("다른 기기의 최신 변경 내용을 불러왔어요. 방금 입력한 내용은 다시 확인해 주세요.");
        }
      }).catch((caught: unknown) => {
        if (!mountedRef.current) return;
        setSyncState("error");
        setError(caught instanceof Error ? caught.message : "저장에 실패했어요. 인터넷 연결을 확인해 주세요.");
        setNotice("저장에 실패했어요. 인터넷 연결을 확인해 주세요.");
      });
    }, 650);

    return () => window.clearTimeout(timer);
  }, [transactions, stocks, settings, cloudReady, db, user]);

  const summary = useMemo(
    () => calculateSummary(transactions, stocks, settings),
    [transactions, stocks, settings],
  );

  const resetDemo = useCallback(() => {
    const demo = makeDemoData();
    setTransactions(demo.transactions);
    setStocks(demo.stocks);
    setSettings(defaultSettings);
  }, []);

  const clearNotice = useCallback(() => setNotice(""), []);

  return {
    transactions,
    setTransactions: setTransactions as Dispatch<SetStateAction<Transaction[]>>,
    stocks,
    setStocks: setStocks as Dispatch<SetStateAction<Stock[]>>,
    settings,
    setSettings: setSettings as Dispatch<SetStateAction<Settings>>,
    summary,
    cloudReady,
    syncState,
    error,
    notice,
    clearNotice,
    resetDemo,
  };
}
