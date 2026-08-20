"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC291fv4IQJDCASTW0c2PvjE3Zyd5j4PVY",
  authDomain: "harusallim-16418.firebaseapp.com",
  projectId: "harusallim-16418",
  storageBucket: "harusallim-16418.firebasestorage.app",
  messagingSenderId: "863156370226",
  appId: "1:863156370226:web:a78f1a2684abeb01f3752b",
} as const;

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);
export const firestore = getFirestore(firebaseApp);
