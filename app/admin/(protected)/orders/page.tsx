"use client";

import { useEffect, useMemo, useState } from "react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import type { OrderStatus } from "@/db/schema";

type OrderItemRow = {
  name: string;
  unit: string;
  quantity: number;
  price: number;
  thumbnail: string | null;
};

type OrderRow = {
  orderNo: string;
  buyer: string;
  dateLabel: string;
  status: OrderStatus;
  amount: number;
  productName: string;
  supplierName: string;
  items: OrderItemRow[];
  courierName: string | null;
  trackingNumber: string | null;
};

const STATUS_OPTIONS: OrderStatus[] = ["결제대기", "결제완료", "배송준비", "배송중", "배송완료", "결제취소"];

const STATUS_CLASS: Record<OrderStatus, string> = {
  결제완료: "bg-emerald-50 text-emerald-700",
  배송준비: "bg-amber-50 text-amber-700",
  배송중: "bg-sky-50 text-sky-700",
  배송완료: "bg-gray-100 text-gray-500",
  결제대기: "bg-red-50 text-red-600",
  결제취소: "bg-gray-100 text-gray-400",
};

export default function OrdersAdminPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "전체">("전체");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<OrderStatus>("배송준비");
  const [syncing, setSyncing] = useState(false);

  const [trackingDraft, setTrackingDraft] = useState<Record<string, { courier: string; tracking: string }>>({});

  useEffect(() => {
    fetch("/api/admin/orders")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setOrders(data.orders);
          const draft: Record<string, { courier: string; tracking: string }> = {};
          for (const o of data.orders as OrderRow[]) {
            draft[o.orderNo] = { courier: o.courierName ?? "", tracking: o.trackingNumber ?? "" };
          }
          setTrackingDraft(draft);
        }
        setLoading(false);
      });
  }, []);

  const refreshOrders = async () => {
    const data = await fetch("/api/admin/orders").then((r) => r.json());
    if (data.success) {
      setOrders(data.orders);
      const draft: Record<string, { courier: string; tracking: string }> = {};
      for (const o of data.orders as OrderRow[]) {
        draft[o.orderNo] = { courier: o.courierName ?? "", tracking: o.trackingNumber ?? "" };
      }
      setTrackingDraft(draft);
    }
  };

  const syncTracking = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/admin/orders/sync-tracking", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        await refreshOrders();
        const failed = (data.suppliers ?? []).filter((x: { ok: boolean }) => !x.ok);
        const failMsg =
          failed.length > 0
            ? `\n(일부 업체 조회 실패: ${failed.map((f: { name: string; error?: string }) => `${f.name} - ${f.error ?? "오류"}`).join(", ")})`
            : "";
        alert(`송장 동기화 완료 — ${data.updated}건 갱신 (확인 ${data.checked}건)${failMsg}`);
      } else {
        alert("송장 동기화 실패: " + (data.errorMessage ?? "오류"));
      }
    } catch {
      alert("송장 동기화 중 오류가 발생했습니다.");
    } finally {
      setSyncing(false);
    }
  };

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== "전체" && o.status !== statusFilter) return false;
      if (query && !o.orderNo.includes(query) && !o.productName.includes(query)) return false;
      return true;
    });
  }, [orders, statusFilter, query]);

  const allFilteredSelected = filtered.length > 0 && filtered.every((o) => selected.has(o.orderNo));

  const toggleOne = (orderNo: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(orderNo)) next.delete(orderNo);
      else next.add(orderNo);
      return next;
    });
  };

  const toggleAllFiltered = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filtered.forEach((o) => next.delete(o.orderNo));
      } else {
        filtered.forEach((o) => next.add(o.orderNo));
      }
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());
  
  const [exporting, setExporting] = useState(false);

  const downloadExcel = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/admin/orders/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderIds: Array.from(selected) }),
      });
      if (!res.ok) {
        alert("엑셀 파일을 만드는 데 실패했어요.");
        return;
      }
      const missingCode = res.headers.get("X-Missing-Code") === "1";
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `food100-bulk-order-${Date.now()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      if (missingCode) {
        alert(
          "일부 상품에 공급업체 발주코드가 없어서 '상품 옵션코드' 칸이 비어있어요. 상품 관리에서 코드를 채운 뒤 업로드해주세요."
        );
      }
    } finally {
      setExporting(false);
    }
  };

  const updateStatus = async (orderNo: string, status: OrderStatus) => {
    setOrders((prev) => prev.map((o) => (o.orderNo === orderNo ? { ...o, status } : o)));
    await fetch(`/api/admin/orders/${orderNo}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  };

  const bulkUpdateStatus = async () => {
    const ids = Array.from(selected);
    setOrders((prev) => prev.map((o) => (selected.has(o.orderNo) ? { ...o, status: bulkStatus } : o)));
    clearSelection();
    await Promise.all(
      ids.map((id) =>
        fetch(`/api/admin/orders/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: bulkStatus }),
        })
      )
    );
  };

  const saveTracking = async (orderNo: string) => {
    const draft = trackingDraft[orderNo];
    if (!draft) return;
    setOrders((prev) =>
      prev.map((o) =>
        o.orderNo === orderNo ? { ...o, courierName: draft.courier, trackingNumber: draft.tracking } : o
      )
    );
    await fetch(`/api/admin/orders/${orderNo}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courierName: draft.courier, trackingNumber: draft.tracking }),
    });
  };

  return (
    <div>
      <AdminPageHeader
        title="주문 관리"
        description="결제 상태와 발주(어드민플러스 전송) 진행 상황을 확인하고 배송 상태를 바꿀 수 있습니다."
      />

      <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg px-4 py-3 mb-5">
        ✅ 실제 주문 데이터베이스에 연결된 화면입니다 — 고객이 결제를 완료하면 이 목록에 실시간으로
        쌓여요. 송장번호는 지금은 직접 입력하는 칸이고, 나중에 어드민플러스 API 연동하면 자동으로
        채워지게 바꿀 수 있어요.
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
        <button
          onClick={syncTracking}
          disabled={syncing}
          className="text-xs font-medium px-3 py-1.5 rounded-full border bg-white text-brand border-brand disabled:opacity-60"
        >
          {syncing ? "동기화 중..." : "🚚 송장 동기화"}
        </button>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="주문번호/상품명 검색"
          className="ml-auto border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-56"
        />
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 bg-gray-900 text-white text-xs rounded-lg px-4 py-2.5 mb-3">
          <span className="font-semibold">{selected.size}건 선택됨</span>
          <select
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value as OrderStatus)}
            className="ml-2 bg-gray-800 text-white rounded px-2 py-1.5 text-xs border border-gray-700"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button onClick={bulkUpdateStatus} className="bg-gray-700 hover:bg-gray-600 rounded px-3 py-1.5 font-medium">
            선택 상태 일괄변경
          </button>
                    <button
            onClick={downloadExcel}
            disabled={exporting}
            className="bg-brand hover:bg-brand-dark rounded px-3 py-1.5 font-medium disabled:opacity-60"
          >
            {exporting ? "만드는 중..." : "식품백억 발주 엑셀 다운로드"}
          </button>
          <button onClick={clearSelection} className="text-gray-300 hover:text-white px-2 ml-auto">
            취소
          </button>
        </div>
      )}

      <div className="bg-white border border-gray-100 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 text-xs border-b border-gray-100">
              <th className="px-3 py-3 font-medium">
                <input
                  type="checkbox"
                  checked={allFilteredSelected}
                  onChange={toggleAllFiltered}
                  className="w-4 h-4 accent-brand"
                />
              </th>
              <th className="px-4 py-3 font-medium">주문번호</th>
              <th className="px-4 py-3 font-medium">상품 / 옵션 / 금액</th>
              <th className="px-4 py-3 font-medium">공급업체</th>
              <th className="px-4 py-3 font-medium">구매자</th>
              <th className="px-4 py-3 font-medium">주문일시</th>
              <th className="px-4 py-3 font-medium text-right">주문금액</th>
              <th className="px-4 py-3 font-medium">송장번호</th>
              <th className="px-4 py-3 font-medium">상태</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => (
              <tr key={o.orderNo} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 align-top">
                <td className="px-3 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(o.orderNo)}
                    onChange={() => toggleOne(o.orderNo)}
                    className="w-4 h-4 accent-brand"
                  />
                </td>
                <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">{o.orderNo}</td>
                <td className="px-4 py-3 text-gray-600 min-w-[220px]">
                  <div className="space-y-1.5">
                    {o.items.map((it, i) => (
                      <div key={i} className="flex items-center gap-2">
                        {it.thumbnail ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={it.thumbnail} alt={it.name} className="w-8 h-8 rounded-md object-cover shrink-0" />
                        ) : (
                          <span className="w-8 h-8 rounded-md bg-gray-100 flex items-center justify-center text-sm shrink-0">
                            📦
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="truncate">
                            {it.name}
                            {it.unit && <span className="text-gray-400"> · {it.unit}</span>}
                            <span className="text-gray-400"> x{it.quantity}</span>
                          </p>
                          <p className="text-xs text-gray-400">{(it.price * it.quantity).toLocaleString()}원</p>
                        </div>
                      </div>
                    ))}
                    {o.items.length === 0 && <span className="text-gray-300">-</span>}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{o.supplierName}</td>
                <td className="px-4 py-3 text-gray-500">{o.buyer}</td>
                <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{o.dateLabel}</td>
                <td className="px-4 py-3 text-right font-medium text-gray-800 whitespace-nowrap">
                  {o.amount.toLocaleString()}원
                </td>
                <td className="px-4 py-3 min-w-[160px]">
                  <div className="flex flex-col gap-1">
                    <input
                      value={trackingDraft[o.orderNo]?.courier ?? ""}
                      onChange={(e) =>
                        setTrackingDraft((prev) => ({
                          ...prev,
                          [o.orderNo]: { ...prev[o.orderNo], courier: e.target.value, tracking: prev[o.orderNo]?.tracking ?? "" },
                        }))
                      }
                      onBlur={() => saveTracking(o.orderNo)}
                      placeholder="택배사"
                      className="border border-gray-200 rounded px-2 py-1 text-xs w-full"
                    />
                    <input
                      value={trackingDraft[o.orderNo]?.tracking ?? ""}
                      onChange={(e) =>
                        setTrackingDraft((prev) => ({
                          ...prev,
                          [o.orderNo]: { ...prev[o.orderNo], tracking: e.target.value, courier: prev[o.orderNo]?.courier ?? "" },
                        }))
                      }
                      onBlur={() => saveTracking(o.orderNo)}
                      placeholder="송장번호"
                      className="border border-gray-200 rounded px-2 py-1 text-xs w-full"
                    />
                  </div>
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
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-gray-400">
                  조건에 맞는 주문이 없습니다.
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-gray-400">
                  불러오는 중...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
