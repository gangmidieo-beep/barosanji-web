"use client";

import { useCallback, useEffect, useState } from "react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Card, Empty, Field, inputCls, inputBase, btnPrimary, btnGhost, fmtDate, todayStr, won, PeriodPicker, periodQuery, type PeriodKey } from "@/components/admin/channels/ui";

type Channel = { id: string; name: string; apiStatus: string };
type Item = { id: string; productId: string | null; name: string; option: string; quantity: number; unitPrice: number };
type Order = {
  id: string;
  channelId: string;
  externalOrderId: string;
  orderedAt: string;
  status: string;
  buyerName: string;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  deliveryMemo: string;
  shippingFee: number;
  claimLoss: number;
  courierName: string | null;
  trackingNumber: string | null;
  supplierOrderNote: string;
  source: string;
  items: Item[];
};

const STATUSES = ["신규", "발주완료", "배송중", "배송완료", "구매확정", "취소", "반품"];
const statusCls: Record<string, string> = {
  신규: "bg-amber-100 text-amber-700",
  발주완료: "bg-blue-100 text-blue-700",
  배송중: "bg-indigo-100 text-indigo-700",
  배송완료: "bg-gray-100 text-gray-600",
  구매확정: "bg-brand-light text-brand-dark",
  취소: "bg-red-100 text-red-600",
  반품: "bg-red-100 text-red-600",
};

const emptyItem = () => ({ productId: "", name: "", option: "", quantity: "1", unitPrice: "" });

export default function ChannelOrdersPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [period, setPeriod] = useState<{ period: PeriodKey; from: string; to: string }>({ period: "last30", from: todayStr(), to: todayStr() });
  const [filterCh, setFilterCh] = useState("");
  const [filterSt, setFilterSt] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    channelId: "coupang",
    externalOrderId: "",
    orderedAt: todayStr() + "T12:00",
    status: "신규",
    buyerName: "",
    receiverName: "",
    receiverPhone: "",
    receiverAddress: "",
    deliveryMemo: "",
    shippingFee: "0",
    items: [emptyItem()],
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const qs = `${periodQuery(period)}${filterCh ? `&channelId=${filterCh}` : ""}${filterSt ? `&status=${encodeURIComponent(filterSt)}` : ""}`;
    const res = await fetch(`/api/admin/channels/orders?${qs}`, { cache: "no-store" });
    const d = await res.json();
    if (d.success) {
      setChannels(d.channels);
      setOrders(d.orders);
    }
    setLoading(false);
  }, [period, filterCh, filterSt]);
  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    setSaving(true);
    setMsg("");
    const res = await fetch("/api/admin/channels/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, orderedAt: new Date(form.orderedAt + ":00+09:00").toISOString() }),
    });
    const d = await res.json();
    setSaving(false);
    if (!d.success) return setMsg(d.errorMessage || "저장 실패");
    setMsg("주문을 등록했습니다.");
    setForm((f) => ({ ...f, externalOrderId: "", buyerName: "", receiverName: "", receiverPhone: "", receiverAddress: "", deliveryMemo: "", items: [emptyItem()] }));
    setShowForm(false);
    load();
  };

  const upload = async (file: File) => {
    setUploading(true);
    setMsg("");
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/admin/channels/orders/import", { method: "POST", body: fd });
    const d = await res.json();
    setUploading(false);
    if (!d.success) return setMsg(d.errorMessage || "업로드 실패");
    setMsg(`${d.saved}건 저장${d.skipped ? `, ${d.skipped}줄 건너뜀 (${d.errors.slice(0, 3).join(" / ")})` : ""}`);
    load();
  };

  const patch = async (id: string, body: Record<string, unknown>) => {
    await fetch(`/api/admin/channels/orders/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    load();
  };
  const remove = async (id: string) => {
    if (!confirm("이 주문을 삭제할까요?")) return;
    await fetch(`/api/admin/channels/orders/${encodeURIComponent(id)}`, { method: "DELETE" });
    load();
  };

  const chName = (id: string) => channels.find((c) => c.id === id)?.name ?? id;
  const orderTotal = (o: Order) => o.items.reduce((s, it) => s + it.unitPrice * it.quantity, 0) + o.shippingFee;
  const newCount = orders.filter((o) => o.status === "신규").length;

  return (
    <div>
      <AdminPageHeader
        title="채널 주문"
        description="오픈마켓(쿠팡·스마트스토어·도매꾹 등) 주문을 한 곳에 모읍니다. API 연동 전에는 수동 등록 또는 각 판매자센터에서 내려받은 엑셀을 템플릿에 맞춰 올려주세요."
        action={
          <div className="flex gap-2">
            <a href="/api/admin/channels/orders/import" className={btnGhost}>엑셀 템플릿 받기</a>
            <label className={btnGhost + " cursor-pointer"}>
              {uploading ? "업로드 중…" : "엑셀 업로드"}
              <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
            </label>
            <button className={btnPrimary + " whitespace-nowrap"} onClick={() => setShowForm((v) => !v)}>{showForm ? "닫기" : "+ 주문 수동 등록"}</button>
          </div>
        }
      />
      {msg && <div className="mb-4 p-3 rounded-lg bg-brand-light text-brand-dark text-sm">{msg}</div>}

      {showForm && (
        <Card title="주문 수동 등록" className="mb-6">
          <div className="grid md:grid-cols-4 gap-3">
            <Field label="채널">
              <select className={inputCls} value={form.channelId} onChange={(e) => setForm({ ...form, channelId: e.target.value })}>
                {channels.filter((c) => c.id !== "barosanji").map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="채널 주문번호 *"><input className={inputCls} value={form.externalOrderId} onChange={(e) => setForm({ ...form, externalOrderId: e.target.value })} /></Field>
            <Field label="주문일시"><input className={inputCls} type="datetime-local" value={form.orderedAt} onChange={(e) => setForm({ ...form, orderedAt: e.target.value })} /></Field>
            <Field label="상태">
              <select className={inputCls} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="구매자"><input className={inputCls} value={form.buyerName} onChange={(e) => setForm({ ...form, buyerName: e.target.value })} /></Field>
            <Field label="수령인"><input className={inputCls} value={form.receiverName} onChange={(e) => setForm({ ...form, receiverName: e.target.value })} /></Field>
            <Field label="연락처"><input className={inputCls} value={form.receiverPhone} onChange={(e) => setForm({ ...form, receiverPhone: e.target.value })} /></Field>
            <Field label="고객부담 배송비"><input className={inputCls} type="number" value={form.shippingFee} onChange={(e) => setForm({ ...form, shippingFee: e.target.value })} /></Field>
            <div className="md:col-span-3"><Field label="주소"><input className={inputCls} value={form.receiverAddress} onChange={(e) => setForm({ ...form, receiverAddress: e.target.value })} /></Field></div>
            <Field label="배송메모"><input className={inputCls} value={form.deliveryMemo} onChange={(e) => setForm({ ...form, deliveryMemo: e.target.value })} /></Field>
          </div>
          <div className="mt-4">
            <div className="text-xs text-gray-500 mb-1">상품</div>
            {form.items.map((it, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 mb-2">
                <input className={inputCls + " col-span-3"} placeholder="바로산지 상품ID (원가 연결용, 선택)" value={it.productId} onChange={(e) => setForm((f) => ({ ...f, items: f.items.map((x, j) => (j === i ? { ...x, productId: e.target.value } : x)) }))} />
                <input className={inputCls + " col-span-4"} placeholder="상품명 *" value={it.name} onChange={(e) => setForm((f) => ({ ...f, items: f.items.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) }))} />
                <input className={inputCls + " col-span-2"} placeholder="옵션" value={it.option} onChange={(e) => setForm((f) => ({ ...f, items: f.items.map((x, j) => (j === i ? { ...x, option: e.target.value } : x)) }))} />
                <input className={inputCls + " col-span-1"} placeholder="수량" type="number" value={it.quantity} onChange={(e) => setForm((f) => ({ ...f, items: f.items.map((x, j) => (j === i ? { ...x, quantity: e.target.value } : x)) }))} />
                <input className={inputCls + " col-span-2"} placeholder="판매가(1개)" type="number" value={it.unitPrice} onChange={(e) => setForm((f) => ({ ...f, items: f.items.map((x, j) => (j === i ? { ...x, unitPrice: e.target.value } : x)) }))} />
              </div>
            ))}
            <div className="flex gap-2">
              <button className={btnGhost} onClick={() => setForm((f) => ({ ...f, items: [...f.items, emptyItem()] }))}>+ 상품 줄 추가</button>
              <button className={btnPrimary} onClick={submit} disabled={saving}>{saving ? "저장 중…" : "주문 저장"}</button>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <PeriodPicker value={period} onChange={setPeriod} />
          <select className={inputBase + " w-40"} value={filterCh} onChange={(e) => setFilterCh(e.target.value)}>
            <option value="">전체 채널</option>
            {channels.filter((c) => c.id !== "barosanji").map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className={inputBase + " w-32"} value={filterSt} onChange={(e) => setFilterSt(e.target.value)}>
            <option value="">전체 상태</option>
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <span className="text-xs text-gray-400 ml-auto">{orders.length}건{newCount > 0 && <span className="text-amber-600 font-semibold ml-2">신규 {newCount}건 발주 필요</span>}</span>
        </div>

        {loading ? (
          <Empty text="불러오는 중..." />
        ) : orders.length === 0 ? (
          <Empty text="주문이 없습니다. 오른쪽 위에서 수동 등록하거나 엑셀을 올려주세요." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 text-xs border-b border-gray-100">
                  <th className="px-3 py-2 font-medium">주문일시</th>
                  <th className="px-3 py-2 font-medium">채널 / 주문번호</th>
                  <th className="px-3 py-2 font-medium">상품</th>
                  <th className="px-3 py-2 font-medium">수령인</th>
                  <th className="px-3 py-2 font-medium text-right">금액</th>
                  <th className="px-3 py-2 font-medium">상태</th>
                  <th className="px-3 py-2 font-medium">송장</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <>
                    <tr key={o.id} className="border-b border-gray-50 hover:bg-gray-50/50 cursor-pointer" onClick={() => setOpen(open === o.id ? null : o.id)}>
                      <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{fmtDate(o.orderedAt)}</td>
                      <td className="px-3 py-2">
                        <div className="font-medium">{chName(o.channelId)}</div>
                        <div className="text-[11px] text-gray-400">{o.externalOrderId} · {o.source === "api" ? "API" : o.source === "excel" ? "엑셀" : "수동"}</div>
                      </td>
                      <td className="px-3 py-2">
                        {o.items[0]?.name}{o.items[0]?.option && <span className="text-gray-400"> ({o.items[0].option})</span>} × {o.items[0]?.quantity}
                        {o.items.length > 1 && <span className="text-xs text-gray-400"> 외 {o.items.length - 1}건</span>}
                        {o.items.some((it) => !it.productId) && <span className="ml-1 text-[10px] text-amber-600">상품 미매핑</span>}
                      </td>
                      <td className="px-3 py-2 text-xs">{o.receiverName}<div className="text-gray-400">{o.receiverPhone}</div></td>
                      <td className="px-3 py-2 text-right font-semibold">{won(orderTotal(o))}</td>
                      <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                        <select className={`text-xs rounded-full px-2 py-1 border-0 ${statusCls[o.status] ?? "bg-gray-100"}`} value={o.status} onChange={(e) => patch(o.id, { status: e.target.value })}>
                          {STATUSES.map((s) => <option key={s}>{s}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-500">{o.trackingNumber ? `${o.courierName ?? ""} ${o.trackingNumber}` : <span className="text-gray-300">-</span>}</td>
                      <td className="px-3 py-2 text-right" onClick={(e) => e.stopPropagation()}><button className={btnGhost} onClick={() => remove(o.id)}>삭제</button></td>
                    </tr>
                    {open === o.id && (
                      <tr key={o.id + "-d"} className="bg-gray-50/60">
                        <td colSpan={8} className="px-4 py-3">
                          <OrderDetail o={o} onPatch={(body) => patch(o.id, body)} />
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function OrderDetail({ o, onPatch }: { o: Order; onPatch: (b: Record<string, unknown>) => void }) {
  const [courier, setCourier] = useState(o.courierName ?? "");
  const [tracking, setTracking] = useState(o.trackingNumber ?? "");
  const [claim, setClaim] = useState(String(o.claimLoss));
  const [note, setNote] = useState(o.supplierOrderNote);
  return (
    <div className="grid md:grid-cols-2 gap-4 text-xs">
      <div>
        <div className="font-semibold text-gray-700 mb-1">주문 상품</div>
        <table className="w-full">
          <tbody>
            {o.items.map((it) => (
              <tr key={it.id} className="border-b border-gray-100 last:border-0">
                <td className="py-1">{it.name}{it.option && <span className="text-gray-400"> ({it.option})</span>}<div className="text-[10px] text-gray-400">{it.productId ?? "바로산지 상품 미매핑 — 원가 0으로 계산됨"}</div></td>
                <td className="py-1 text-right">{it.quantity}개</td>
                <td className="py-1 text-right">{won(it.unitPrice * it.quantity)}</td>
              </tr>
            ))}
            {o.shippingFee > 0 && <tr><td className="py-1 text-gray-500">고객부담 배송비</td><td /><td className="py-1 text-right">{won(o.shippingFee)}</td></tr>}
          </tbody>
        </table>
        <div className="mt-2 text-gray-600">
          <div>구매자 {o.buyerName || "-"} · 수령인 {o.receiverName} {o.receiverPhone}</div>
          <div>{o.receiverAddress}</div>
          {o.deliveryMemo && <div className="text-gray-400">메모: {o.deliveryMemo}</div>}
        </div>
      </div>
      <div className="space-y-2">
        <div className="font-semibold text-gray-700">송장 · 클레임 · 발주 메모</div>
        <div className="flex gap-2">
          <input className={inputCls} placeholder="택배사" value={courier} onChange={(e) => setCourier(e.target.value)} />
          <input className={inputCls} placeholder="송장번호" value={tracking} onChange={(e) => setTracking(e.target.value)} />
          <button className={btnGhost + " whitespace-nowrap"} onClick={() => onPatch({ courierName: courier, trackingNumber: tracking, status: o.status === "신규" || o.status === "발주완료" ? "배송중" : o.status })}>송장 저장</button>
        </div>
        <div className="flex gap-2">
          <input className={inputCls} type="number" placeholder="클레임 손실(반품 배송비 등)" value={claim} onChange={(e) => setClaim(e.target.value)} />
          <button className={btnGhost + " whitespace-nowrap"} onClick={() => onPatch({ claimLoss: Number(claim) })}>손실 저장</button>
        </div>
        <div className="flex gap-2">
          <input className={inputCls} placeholder="어드민플러스 발주 메모 (발주번호 등)" value={note} onChange={(e) => setNote(e.target.value)} />
          <button className={btnGhost + " whitespace-nowrap"} onClick={() => onPatch({ supplierOrderNote: note, status: o.status === "신규" ? "발주완료" : o.status })}>발주완료 처리</button>
        </div>
        <p className="text-[10px] text-gray-400">API 연동 후에는 발주·송장이 자동 처리되고, 여기서는 확인만 하게 됩니다.</p>
      </div>
    </div>
  );
}
