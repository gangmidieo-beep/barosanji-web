"use client";

import { useMemo, useState } from "react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import type { MockOrder, OrderStatus } from "@/lib/dashboard-data";

const STATUS_OPTIONS: OrderStatus[] = ["결제대기", "결제완료", "배송준비", "배송중", "배송완료"];

const STATUS_CLASS: Record<OrderStatus, string> = {
  결제완료: "bg-emerald-50 text-emerald-700",
  배송준비: "bg-amber-50 text-amber-700",
  배송중: "bg-sky-50 text-sky-700",
  배송완료: "bg-gray-100 text-gray-500",
  결제대기: "bg-red-50 text-red-600",
};

export default function OrdersAdminPage() {
  // 실제 서비스 오픈 전 상태 — 아직 진짜 주문이 없으므로 빈 목록으로 시작 (실 서비스 전환 시 주문 DB 조회로 교체)
  const [orders, setOrders] = useState<MockOrder[]>([]);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "전체">("전체");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== "전체" && o.status !== statusFilter) return false;
      if (query && !o.orderNo.includes(query) && !o.productName.includes(query)) return false;
      return true;
    });
  }, [orders, statusFilter, query]);

  const updateStatus = (orderNo: string, status: OrderStatus) => {
    setOrders((prev) => prev.map((o) => (o.orderNo === orderNo ? { ...o, status } : o)));
  };

  return (
    <div>
      <AdminPageHeader
        title="주문 관리"
        description="결제 상태와 발주(어드민플러스 전송) 진행 상황을 확인하고 배송 상태를 바꿀 수 있습니다."
      />

      <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg px-4 py-3 mb-5">
        ⚠️ 데모 화면입니다 — 아래 목록은 예시 데이터이며, 상태 변경은 이 브라우저 세션에서만 유지되고
        새로고침하면 초기화됩니다. 실제 서비스에서는 주문 DB와 연결해야 합니다.
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex gap-1.5 flex-wrap">
          {(["전체", ...STATUS_OPTIONS] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border ${
                statusFilter === s
                  ? "bg-brand text-white border-brand"
                  : "bg-white text-gray-600 border-gray-200"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="주문번호/상품명 검색"
          className="ml-auto border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-56"
        />
      </div>

      <div className="bg-white border border-gray-100 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 text-xs border-b border-gray-100">
              <th className="px-4 py-3 font-medium">주문번호</th>
              <th className="px-4 py-3 font-medium">상품</th>
              <th className="px-4 py-3 font-medium">공급업체</th>
              <th className="px-4 py-3 font-medium">구매자</th>
              <th className="px-4 py-3 font-medium">주문일시</th>
              <th className="px-4 py-3 font-medium text-right">금액</th>
              <th className="px-4 py-3 font-medium">상태</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => (
              <tr key={o.orderNo} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">{o.orderNo}</td>
                <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate">{o.productName}</td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{o.supplierName}</td>
                <td className="px-4 py-3 text-gray-500">{o.buyer}</td>
                <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{o.dateLabel}</td>
                <td className="px-4 py-3 text-right font-medium text-gray-800 whitespace-nowrap">
                  {o.amount.toLocaleString()}원
                </td>
                <td className="px-4 py-3">
                  <select
                    value={o.status}
                    onChange={(e) => updateStatus(o.orderNo, e.target.value as OrderStatus)}
                    className={`text-xs font-semibold rounded-full px-2.5 py-1 border-0 outline-none ${STATUS_CLASS[o.status]}`}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                  조건에 맞는 주문이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
