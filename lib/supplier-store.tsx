"use client";

/**
 * 거래처(공급업체) 목록 관리 — 관리자가 화면에서 직접 거래처를 추가/이름을 수정하는 곳.
 * 실제 DB(suppliers 테이블)에 저장되어, 설정 화면과 상품 등록 화면이 항상 같은 목록을 봅니다.
 *
 * client_id/client_secret은 여기서 관리하지 않습니다 — 발주(AdminPlus) 연동에 쓰이는
 * 민감한 값이라, 지금처럼 Railway 서버 환경변수(ADMINPLUS_CLIENT_ID_<envKey> 등)로만
 * 관리하는 게 더 안전합니다.
 */

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type ManagedSupplier = {
  id: string;
  name: string;
  envKey: string;
};

type SupplierContextType = {
  suppliers: ManagedSupplier[];
  loading: boolean;
  addSupplier: () => void;
  updateSupplier: (id: string, field: "name", value: string) => void;
  removeSupplier: (id: string) => void;
  getSupplierById: (id: string) => ManagedSupplier | undefined;
};

const SupplierContext = createContext<SupplierContextType | undefined>(undefined);

export function SupplierProvider({ children }: { children: ReactNode }) {
  const [suppliers, setSuppliers] = useState<ManagedSupplier[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    const res = await fetch("/api/admin/suppliers");
    const data = await res.json();
    if (data.success) setSuppliers(data.suppliers);
    setLoading(false);
  };

  useEffect(() => {
    reload();
  }, []);

  const addSupplier = async () => {
    const res = await fetch("/api/admin/suppliers", { method: "POST" });
    const data = await res.json();
    if (data.success) setSuppliers((prev) => [...prev, data.supplier]);
  };

  const updateSupplier = (id: string, field: "name", value: string) => {
    setSuppliers((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
    fetch(`/api/admin/suppliers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
  };

  const removeSupplier = async (id: string) => {
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
    await fetch(`/api/admin/suppliers/${id}`, { method: "DELETE" });
  };

  const getSupplierById = (id: string) => suppliers.find((s) => s.id === id);

  return (
    <SupplierContext.Provider
      value={{ suppliers, loading, addSupplier, updateSupplier, removeSupplier, getSupplierById }}
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
