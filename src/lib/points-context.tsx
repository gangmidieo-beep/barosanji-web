"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type PointHistoryEntry = {
  id: string;
  date: string; // ISO timestamp
  label: string;
  amount: number; // positive = earn, negative = spend
};

type PointsState = {
  balance: number;
  history: PointHistoryEntry[];
  quizDate: string; // YYYY-MM-DD, the day `answeredIds` applies to
  answeredIds: string[];
  claimedOneTime: string[]; // 회원가입 축하금, 홈 화면 설치 축하금 등 평생 1회만 지급되는 항목
  quizDayStart: number | null; // 오늘 퀴즈 문제가 1시간마다 하나씩 열리는 기준 시각(epoch ms)
};

type PointsContextType = {
  balance: number;
  history: PointHistoryEntry[];
  todayAnsweredIds: string[];
  quizDayStart: number;
  isAnsweredToday: (quizId: string) => boolean;
  answerQuiz: (quizId: string, amount: number, label: string) => void;
  spendPoints: (amount: number, label: string) => boolean;
  hasClaimed: (id: string) => boolean;
  claimOnce: (id: string, amount: number, label: string) => boolean;
};

const PointsContext = createContext<PointsContextType | undefined>(undefined);

const STORAGE_KEY = "farm-mall-points";

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

const initialState: PointsState = {
  balance: 0,
  history: [],
  quizDate: todayKey(),
  answeredIds: [],
  claimedOneTime: [],
  quizDayStart: null,
};

export function PointsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PointsState>(initialState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: PointsState = JSON.parse(raw);
        // reset daily quiz progress if it's a new day
        if (parsed.quizDate !== todayKey()) {
          parsed.quizDate = todayKey();
          parsed.answeredIds = [];
          parsed.quizDayStart = null;
        }
        if (!parsed.claimedOneTime) parsed.claimedOneTime = [];
        if (parsed.quizDayStart === undefined) parsed.quizDayStart = null;
        setState(parsed);
      }
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [state, hydrated]);

  // 오늘 처음 접속한 시점을 문제 오픈 기준 시각으로 고정 (1시간마다 문제가 하나씩 열림)
  useEffect(() => {
    if (!hydrated) return;
    if (state.quizDate === todayKey() && state.quizDayStart !== null) return;
    setState((prev) => ({ ...prev, quizDate: todayKey(), quizDayStart: Date.now() }));
  }, [hydrated, state.quizDate, state.quizDayStart]);

  const isAnsweredToday = (quizId: string) =>
    state.quizDate === todayKey() && state.answeredIds.includes(quizId);

  const answerQuiz = (quizId: string, amount: number, label: string) => {
    setState((prev) => {
      const key = todayKey();
      const answeredIds = prev.quizDate === key ? prev.answeredIds : [];
      if (answeredIds.includes(quizId)) return { ...prev, quizDate: key, answeredIds };
      return {
        ...prev,
        balance: prev.balance + amount,
        history: [
          { id: `${Date.now()}`, date: new Date().toISOString(), label, amount },
          ...prev.history,
        ].slice(0, 50),
        quizDate: key,
        answeredIds: [...answeredIds, quizId],
      };
    });
  };

  const spendPoints = (amount: number, label: string) => {
    let success = false;
    setState((prev) => {
      if (prev.balance < amount) return prev;
      success = true;
      return {
        ...prev,
        balance: prev.balance - amount,
        history: [
          { id: `${Date.now()}`, date: new Date().toISOString(), label, amount: -amount },
          ...prev.history,
        ].slice(0, 50),
      };
    });
    return success;
  };

  const todayAnsweredIds = state.quizDate === todayKey() ? state.answeredIds : [];

  const hasClaimed = (id: string) => state.claimedOneTime.includes(id);

  // 회원가입 축하금, 홈 화면 설치 축하금처럼 평생 딱 1번만 지급되는 적립금
  const claimOnce = (id: string, amount: number, label: string) => {
    let success = false;
    setState((prev) => {
      if (prev.claimedOneTime.includes(id)) return prev;
      success = true;
      return {
        ...prev,
        balance: prev.balance + amount,
        history: [
          { id: `${Date.now()}`, date: new Date().toISOString(), label, amount },
          ...prev.history,
        ].slice(0, 50),
        claimedOneTime: [...prev.claimedOneTime, id],
      };
    });
    return success;
  };

  return (
    <PointsContext.Provider
      value={{
        balance: state.balance,
        history: state.history,
        todayAnsweredIds,
        quizDayStart: state.quizDayStart ?? Date.now(),
        isAnsweredToday,
        answerQuiz,
        spendPoints,
        hasClaimed,
        claimOnce,
      }}
    >
      {children}
    </PointsContext.Provider>
  );
}

export function usePoints() {
  const ctx = useContext(PointsContext);
  if (!ctx) throw new Error("usePoints must be used within PointsProvider");
  return ctx;
}
