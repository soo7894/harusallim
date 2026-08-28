"use client";

import { useEffect, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches
    || ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
}

export function InstallAppCard() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(() => typeof window !== "undefined" && isStandalone());
  const [isIos] = useState(() => typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent));

  useEffect(() => {
    const capturePrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const markInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", capturePrompt);
    window.addEventListener("appinstalled", markInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", capturePrompt);
      window.removeEventListener("appinstalled", markInstalled);
    };
  }, []);

  async function install() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") setInstallPrompt(null);
  }

  return <article className="panel install-app-panel">
    <span className="install-app-icon" aria-hidden="true">ㅎ</span>
    <div className="install-app-copy">
      <h3>{installed ? "하루살림 앱으로 실행 중" : "홈 화면에 하루살림 설치"}</h3>
      <p>{installed
        ? "브라우저 주소창 없이 독립된 앱 화면으로 사용하고 있어요."
        : isIos
          ? "Safari의 공유 버튼을 누른 뒤 ‘홈 화면에 추가’를 선택해 주세요."
          : "한 번 설치하면 홈 화면에서 바로 열고 앱처럼 사용할 수 있어요."}</p>
    </div>
    {!installed && installPrompt && <button className="install-app-button" onClick={() => void install()}>앱 설치</button>}
    {!installed && !installPrompt && !isIos && <small className="install-app-hint">브라우저 메뉴에서 ‘앱 설치’ 또는 ‘홈 화면에 추가’를 선택하세요.</small>}
  </article>;
}
