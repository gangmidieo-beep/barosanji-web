"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { usePoints } from "@/lib/points-context";

const DISMISS_KEY = "barosanji-install-dismissed";
const INSTALL_BONUS_ID = "install-bonus";
const INSTALL_BONUS_AMOUNT = 1000;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

// "추가" 버튼 한 번으로 바로 설치되는 크롬(안드로이드)용 방식
// vs. 브라우저가 beforeinstallprompt를 지원 안 해서 직접 안내만 보여주는 방식
type Mode = "native" | "fallback-ios" | "fallback-android" | null;

export default function InstallPrompt() {
  const { claimOnce, hasClaimed } = usePoints();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [mode, setMode] = useState<Mode>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

    const ua = window.navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    const isAndroid = /Android/.test(ua);

    const handler = (e: Event) => {
      e.preventDefault();
      if (timerRef.current) clearTimeout(timerRef.current);
      setDeferred(e as BeforeInstallPromptEvent);
      setMode("native");
    };
    window.addEventListener("beforeinstallprompt", handler);

    // 실제로 설치가 완료됐을 때 브라우저가 쏴주는 표준 이벤트 — 여기서 적립금 지급 확정
    const onInstalled = () => {
      claimOnce(INSTALL_BONUS_ID, INSTALL_BONUS_AMOUNT, "홈 화면 바로가기 설치 적립금");
    };
    window.addEventListener("appinstalled", onInstalled);

    // 삼성인터넷/사파리 등 beforeinstallprompt를 지원(또는 발생)하지 않는 브라우저 대응:
    // 일정 시간 안에 표준 이벤트가 안 오면, 직접 안내 문구로 대체해서 보여줌
    if (isIOS) {
      timerRef.current = setTimeout(() => setMode((m) => m ?? "fallback-ios"), 1000);
    } else if (isAndroid) {
      timerRef.current = setTimeout(() => setMode((m) => m ?? "fallback-android"), 1500);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", onInstalled);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [claimOnce]);

  const dismiss = () => {
    setMode(null);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    // 실제 지급은 브라우저의 appinstalled 이벤트에서 처리됨 (설치가 실제로 완료된 시점)
    dismiss();
  };

  // 삼성인터넷/사파리처럼 설치 완료를 감지할 표준 이벤트가 없는 브라우저용 —
  // 안내대로 완료했다고 알려주면 그 자리에서 적립
  const completeManualInstall = () => {
    claimOnce(INSTALL_BONUS_ID, INSTALL_BONUS_AMOUNT, "홈 화면 바로가기 설치 적립금");
    dismiss();
  };

  if (!mode) return null;

  const alreadyEarned = hasClaimed(INSTALL_BONUS_ID);
  const bonusText = alreadyEarned ? "" : ` (+${INSTALL_BONUS_AMOUNT.toLocaleString()}원 적립)`;

  const copy =
    mode === "fallback-ios"
      ? { title: `홈 화면에 바로가기 추가${bonusText}`, desc: "하단 공유 버튼 → \"홈 화면에 추가\"를 눌러주세요" }
      : mode === "fallback-android"
        ? { title: `홈 화면에 바로가기 추가${bonusText}`, desc: "우측 상단 메뉴(⋮) → \"홈 화면에 추가\"를 눌러주세요" }
        : { title: `홈 화면에 바로가기 추가${bonusText}`, desc: "앱처럼 한 번에 열려요" };

  return (
    <div className="mx-4 mt-3 flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-3 py-2.5 shadow-sm">
      <Image src="/icons/icon-192.png" alt="바로산지" width={36} height={36} className="rounded-lg shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-900">{copy.title}</p>
        <p className="text-xs text-gray-500">{copy.desc}</p>
      </div>
      {mode === "native" && (
        <button
          onClick={install}
          className="shrink-0 bg-gray-900 text-white text-xs font-semibold px-3.5 py-2 rounded-full active:scale-95 transition"
        >
          추가
        </button>
      )}
      {(mode === "fallback-ios" || mode === "fallback-android") && !alreadyEarned && (
        <button
          onClick={completeManualInstall}
          className="shrink-0 bg-gray-900 text-white text-xs font-semibold px-3 py-2 rounded-full active:scale-95 transition"
        >
          완료했어요
        </button>
      )}
      <button onClick={dismiss} aria-label="닫기" className="shrink-0 text-gray-300 hover:text-gray-400 px-1 text-lg leading-none">
        ✕
      </button>
    </div>
  );
}
