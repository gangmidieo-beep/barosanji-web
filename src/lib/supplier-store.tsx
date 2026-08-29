"use client";

/**
 * 거래처(공급업체) 목록 관리 — 관리자가 화면에서 직접 거래처를 추가/이름 수정하고
 * 어드민플러스 client_id/client_secret을 입력해두는 곳.
 *
 * 지금은 이 브라우저(localStorage)에만 저장되는 데모 상태입니다. 실제 자동발주에
 * 쓰려면 여기 입력한 값을 그대로 알려주셔서 레일웨이 서버 환경변수로 등록해야 해요.
 */

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { suppliers as defaultSuppliers } from "./suppliers";

export type ManagedSupplier = {
  id: string;
  name: string;
  envKey: string;
  clientId: string;
  clientSecret: string;
};

type SupplierContextType = {
  suppliers: ManagedSupplier[];
  addSupplier: () => void;
  updateSupplier: (id: string, field: "name" | "clientId" | "clientSecret", value: string) => void;
  removeSupplier: (id: string) => void;
  getSupplierById: (id: string) => ManagedSupplier | undefined;
};

const SupplierContext = createContext<SupplierContextType | undefined>(undefined);

const STORAGE_KEY = "barosanji-admin-suppliers";

function initialSuppliers(): ManagedSupplier[] {
  return defaultSuppliers.map((s) => ({ ...s, clientId: "", clientSecret: "" }));
}

function loadStored(): ManagedSupplier[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? (parsed as ManagedSupplier[]) : null;
  } catch {
    return null;
  }
}

function nextEnvKey(existing: ManagedSupplier[]): string {
  // 새 거래처를 추가할 때마다 겹치지 않는 환경변수 접미사를 만들어줌 (예: NEW1, NEW2 ...)
  let n = existing.length + 1;
  const used = new Set(existing.map((s) => s.envKey));
  while (used.has(`NEW${n}`)) n++;
  return `NEW${n}`;
}

export function SupplierProvider({ children }: { children: ReactNode }) {
  const [suppliers, setSuppliers] = useState<ManagedSupplier[]>(initialSuppliers);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = loadStored();
    if (stored) setSuppliers(stored);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(suppliers));
    } catch {
      // ignore
    }
  }, [suppliers, hydrated]);

  const addSupplier = () => {
    setSuppliers((prev) => [
      ...prev,
      { id: `supplier-${Date.now()}`, name: "", envKey: nextEnvKey(prev), clientId: "", clientSecret: "" },
    ]);
  };

  const updateSupplier = (id: string, field: "name" | "clientId" | "clientSecret", value: string) => {
    setSuppliers((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const removeSupplier = (id: string) => {
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
  };

  const getSupplierById = (id: string) => suppliers.find((s) => s.id === id);

  return (
    <SupplierContext.Provider
      value={{ suppliers, addSupplier, updateSupplier, removeSupplier, getSupplierById }}
    >
      {children}
    </SupplierContext.Provider>
  );
}

export function useSuppliers() {
  const ctx = useContext(SupplierContext);
  if (!ctx) throw new Error("useSuppliers must be used within SupplierProvider");
  return ctx;
}
