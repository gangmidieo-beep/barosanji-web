"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const DISMISS_KEY = "barosanji-install-dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // 이미 설치돼 있거나(standalone), 이전에 닫은 적 있으면 다시 안 보여줌
    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(DISMISS_KEY) === "1";
    } catch {}
    if (isStandalone || dismissed) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    dismiss();
  };

  if (!visible) return null;

  return (
    <div className="mx-4 mt-3 flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-3 py-2.5 shadow-sm">
      <Image src="/icons/icon-192.png" alt="바로산지" width={36} height={36} className="rounded-lg shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-900">홈 화면에 바로가기 추가</p>
        <p className="text-xs text-gray-500">앱처럼 한 번에 열려요</p>
      </div>
      <button
        onClick={install}
        className="shrink-0 bg-gray-900 text-white text-xs font-semibold px-3.5 py-2 rounded-full active:scale-95 transition"
      >
        추가
      </button>
      <button onClick={dismiss} aria-label="닫기" className="shrink-0 text-gray-300 hover:text-gray-400 px-1 text-lg leading-none">
        ✕
      </button>
    </div>
  );
}
