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
};

type PointsContextType = {
  balance: number;
  history: PointHistoryEntry[];
  todayAnsweredIds: string[];
  isAnsweredToday: (quizId: string) => boolean;
  answerQuiz: (quizId: string, amount: number, label: string) => void;
  spendPoints: (amount: number, label: string) => boolean;
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
        }
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

  return (
    <PointsContext.Provider
      value={{
        balance: state.balance,
        history: state.history,
        todayAnsweredIds,
        isAnsweredToday,
        answerQuiz,
        spendPoints,
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
