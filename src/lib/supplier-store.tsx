"use client";

/**
 * 거래처(공급업체) 목록 관리 — 관리자가 화면에서 직접 거래처를 추가/이름 수정하는 곳.
 *
 * 예전에는 브라우저(localStorage)에만 저장돼서, 다른 PC나 폰에서 열면 이름이 초기값으로
 * 보이고 브라우저를 지우면 날아가는 문제가 있었다. 이제는 실제 DB(suppliers 테이블)를
 * 읽고 쓰므로, 어느 기기에서 접속하든 같은 목록이 보인다.
 */

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";

export type ManagedSupplier = {
  id: string;
  name: string;
  envKey: string;
  /** false면 이 업체로 발주가 나가지 않고, 이 업체 상품은 고객 화면에서 품절 처리된다 */
  orderingEnabled: boolean;
};

type SupplierContextType = {
  suppliers: ManagedSupplier[];
  loading: boolean;
  addSupplier: () => Promise<void>;
  updateSupplier: (id: string, field: "name", value: string) => void;
  removeSupplier: (id: string) => Promise<void>;
  setOrderingEnabled: (id: string, enabled: boolean) => Promise<void>;
  getSupplierById: (id: string) => ManagedSupplier | undefined;
};

const SupplierContext = createContext<SupplierContextType | undefined>(undefined);

export function SupplierProvider({ children }: { children: ReactNode }) {
  const [suppliers, setSuppliers] = useState<ManagedSupplier[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/suppliers");
      const data = await res.json();
      if (data.success) setSuppliers(data.suppliers);
    } catch {
      // 네트워크 오류 시엔 기존 목록 유지
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const addSupplier = async () => {
    const res = await fetch("/api/admin/suppliers", { method: "POST" });
    const data = await res.json().catch(() => null);
    if (data?.success && data.supplier) {
      setSuppliers((prev) => [...prev, data.supplier]);
    }
  };

  // 이름은 타이핑할 때마다 저장하면 요청이 너무 많아지니, 화면에서는 바로 바꿔주고
  // 서버 저장은 뒤에서 조용히 처리한다 (실패해도 화면은 그대로 유지).
  const updateSupplier = (id: string, field: "name", value: string) => {
    setSuppliers((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
    fetch(`/api/admin/suppliers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: value }),
    }).catch(() => {});
  };

  const removeSupplier = async (id: string) => {
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
    await fetch(`/api/admin/suppliers/${id}`, { method: "DELETE" }).catch(() => {});
  };

  // 발주 on/off는 판매 중단으로도 이어지는 작업이라, 화면을 먼저 바꾸지 않고
  // 서버 저장이 성공한 뒤에만 반영한다 (실패했는데 꺼진 것처럼 보이면 안 되므로).
  const setOrderingEnabled = async (id: string, enabled: boolean) => {
    const res = await fetch(`/api/admin/suppliers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderingEnabled: enabled }),
    }).catch(() => null);
    if (!res?.ok) {
      alert("발주 설정을 저장하지 못했습니다. 잠시 후 다시 시도해주세요.");
      return;
    }
    setSuppliers((prev) => prev.map((s) => (s.id === id ? { ...s, orderingEnabled: enabled } : s)));
  };

  const getSupplierById = (id: string) => suppliers.find((s) => s.id === id);

  return (
    <SupplierContext.Provider
      value={{ suppliers, loading, addSupplier, updateSupplier, removeSupplier, setOrderingEnabled, getSupplierById }}
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
