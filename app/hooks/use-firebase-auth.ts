"use client";

import {
  GoogleAuthProvider,
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { useCallback, useEffect, useState } from "react";
import { firebaseAuth, firestore } from "../firebase/client";

function friendlyAuthError(caught: unknown) {
  const code = typeof caught === "object" && caught && "code" in caught ? String(caught.code) : "";
  if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
    return "로그인 창을 닫았어요. 다시 눌러 계속할 수 있어요.";
  }
  if (code === "auth/popup-blocked") {
    return "브라우저가 로그인 창을 막았어요. 팝업을 허용한 뒤 다시 눌러주세요.";
  }
  return caught instanceof Error ? `구글 로그인을 시작하지 못했어요: ${caught.message}` : "로그인 연결을 확인해 주세요.";
}

export function useFirebaseAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    let unsubscribe = () => {};

    void setPersistence(firebaseAuth, browserLocalPersistence)
      .then(() => {
        if (!active) return;
        unsubscribe = onAuthStateChanged(firebaseAuth, (nextUser) => {
          if (!active) return;
          setUser(nextUser);
          setReady(true);
          setBusy(false);
        });
      })
      .catch((caught) => {
        if (!active) return;
        setError(friendlyAuthError(caught));
        setReady(true);
        setBusy(false);
      });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const loginWithGoogle = useCallback(async () => {
    setBusy(true);
    setError("");
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    try {
      await signInWithPopup(firebaseAuth, provider);
    } catch (caught) {
      setBusy(false);
      setError(friendlyAuthError(caught));
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await signOut(firebaseAuth);
    } catch (caught) {
      setError(caught instanceof Error ? `로그아웃하지 못했어요: ${caught.message}` : "로그아웃하지 못했어요.");
    }
  }, []);

  return { db: firestore, user, ready, busy, error, setError, loginWithGoogle, logout };
}
