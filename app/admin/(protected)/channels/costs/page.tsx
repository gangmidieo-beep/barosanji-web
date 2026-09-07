"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Card, Empty, Field, inputCls, inputBase, btnPrimary, btnGhost, fmtDay, todayStr, won, pct } from "@/components/admin/channels/ui";

type Product = { id: string; name: string; price: number; unit: string; supplierId: string; category: string };
type Cost = { id: number; productId: string; costPrice: number; shippingCost: number; packagingCost: number; effectiveFrom: string; note: string };

export default function CostsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [costs, setCosts] = useState<Cost[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [q, setQ] = useState("");
  const [form, setForm] = useState({ productId: "", costPrice: "", shippingCost: "3500", packagingCost: "0", effectiveFrom: todayStr(), note: "" });
  const [saving, setSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/channels/costs", { cache: "no-store" });
    const d = await res.json();
    if (d.success) {
      setProducts(d.products);
      setCosts(d.costs);
    }
    setLoading(false);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  /** 상품별 현재 유효 원가 */
  const current = useMemo(() => {
    const now = Date.now();
    const m = new Map<string, Cost>();
    for (const c of costs) {
      if (new Date(c.effectiveFrom).getTime() > now) continue;
      const prev = m.get(c.productId);
      if (!prev || new Date(c.effectiveFrom) > new Date(prev.effectiveFrom)) m.set(c.productId, c);
    }
    return m;
  }, [costs]);

  const filtered = products.filter((p) => !q || p.name.includes(q) || p.id.includes(q) || p.category.includes(q));
  const missing = products.filter((p) => !current.has(p.id)).length;

  const save = async (override?: Partial<typeof form>) => {
    const body = { ...form, ...override };
    if (!body.productId) return setMsg("상품을 선택해주세요.");
    setSaving(true);
    setMsg("");
    const res = await fetch("/api/admin/channels/costs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await res.json();
    setSaving(false);
    if (!d.success) return setMsg(d.errorMessage || "저장 실패");
    setMsg("원가를 저장했습니다.");
    setForm((f) => ({ ...f, productId: "", costPrice: "", note: "" }));
    load();
  };

  const remove = async (id: number) => {
    if (!confirm("이 원가 기록을 삭제할까요?")) return;
    await fetch(`/api/admin/channels/costs?id=${id}`, { method: "DELETE" });
    load();
  };

  // 표 안에서 바로 입력하는 빠른 등록
  const [quick, setQuick] = useState<Record<string, { costPrice: string; shippingCost: string; packagingCost: string }>>({});
  const quickSave = async (p: Product) => {
    const v = quick[p.id];
    if (!v?.costPrice) return setMsg(`${p.name}: 매입가를 입력해주세요.`);
    await save({ productId: p.id, costPrice: v.costPrice, shippingCost: v.shippingCost || "0", packagingCost: v.packagingCost || "0", effectiveFrom: todayStr(), note: "" });
    setQuick((s) => ({ ...s, [p.id]: { costPrice: "", shippingCost: "", packagingCost: "" } }));
  };

  return (
    <div>
      <AdminPageHeader
        title="상품 원가"
        description="공급업체 매입가·택배비·포장비를 상품별로 입력합니다. 원가 = (매입가 + 포장비) × 수량 + 택배비(주문당 1회). 날짜별 이력이 남아 과거 주문은 당시 원가로 계산됩니다."
      />
      {msg && <div className="mb-4 p-3 rounded-lg bg-brand-light text-brand-dark text-sm">{msg}</div>}
      {loading && <Empty text="불러오는 중..." />}
      {!loading && (
        <>
          {missing > 0 && (
            <div className="mb-4 p-3 rounded-lg bg-amber-50 text-amber-800 text-sm">
              ⚠️ 원가가 없는 상품 {missing}개. 아래 표에서 매입가를 입력하고 저장하면 바로 순수익 계산에 반영됩니다.
            </div>
          )}

          <Card title="원가 등록 (날짜 지정)" className="mb-6">
            <div className="grid md:grid-cols-6 gap-3 items-end">
              <div className="md:col-span-2">
                <Field label="상품">
                  <select className={inputCls} value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })}>
                    <option value="">선택…</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.unit}) — 판매가 {p.price.toLocaleString()}원</option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="매입가 (1개)"><input className={inputCls} type="number" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} /></Field>
              <Field label="택배비 (주문당)"><input className={inputCls} type="number" value={form.shippingCost} onChange={(e) => setForm({ ...form, shippingCost: e.target.value })} /></Field>
              <Field label="포장비 (1개)"><input className={inputCls} type="number" value={form.packagingCost} onChange={(e) => setForm({ ...form, packagingCost: e.target.value })} /></Field>
              <Field label="적용시작일"><input className={inputCls} type="date" value={form.effectiveFrom} onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })} /></Field>
            </div>
            <div className="flex gap-3 mt-3 items-end">
              <div className="flex-1"><Field label="메모"><input className={inputCls} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="예) 10월 산지 시세 반영" /></Field></div>
              <button className={btnPrimary} onClick={() => save()} disabled={saving}>{saving ? "저장 중…" : "저장"}</button>
            </div>
          </Card>

          <Card title="상품별 현재 원가" className="mb-6">
            <div className="flex items-center gap-3 mb-3">
              <input className={inputBase + " w-72"} placeholder="상품명·카테고리 검색" value={q} onChange={(e) => setQ(e.target.value)} />
              <span className="text-xs text-gray-400">{filtered.length}개</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 text-xs border-b border-gray-100">
                    <th className="px-3 py-2 font-medium">상품</th>
                    <th className="px-3 py-2 font-medium text-right">판매가</th>
                    <th className="px-3 py-2 font-medium text-right">매입가</th>
                    <th className="px-3 py-2 font-medium text-right">택배비</th>
                    <th className="px-3 py-2 font-medium text-right">포장비</th>
                    <th className="px-3 py-2 font-medium text-right">1개 마진(수수료 전)</th>
                    <th className="px-3 py-2 font-medium">적용일</th>
                    <th className="px-3 py-2 font-medium">빠른 입력 / 수정</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => {
                    const c = current.get(p.id);
                    const margin = c ? p.price - c.costPrice - c.packagingCost - c.shippingCost : null;
                    const qv = quick[p.id] ?? { costPrice: "", shippingCost: "", packagingCost: "" };
                    return (
                      <tr key={p.id} className={`border-b border-gray-50 last:border-0 ${!c ? "bg-amber-50/40" : ""}`}>
                        <td className="px-3 py-2">
                          <div className="font-medium">{p.name}</div>
                          <div className="text-[10px] text-gray-400">{p.id} · {p.category} · {p.unit}</div>
                        </td>
                        <td className="px-3 py-2 text-right">{won(p.price)}</td>
                        <td className="px-3 py-2 text-right">{c ? won(c.costPrice) : <span className="text-amber-600 text-xs">미입력</span>}</td>
                        <td className="px-3 py-2 text-right text-gray-500">{c ? won(c.shippingCost) : "-"}</td>
                        <td className="px-3 py-2 text-right text-gray-500">{c ? won(c.packagingCost) : "-"}</td>
                        <td className={`px-3 py-2 text-right font-semibold ${margin != null && margin < 0 ? "text-red-500" : "text-brand-dark"}`}>
                          {margin != null ? `${won(margin)} (${pct(margin / p.price)})` : "-"}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-500">{c ? fmtDay(c.effectiveFrom) : "-"}</td>
                        <td className="px-3 py-2">
                          <div className="flex gap-1 items-center">
                            <input className={inputBase + " w-24"} placeholder="매입가" type="number" value={qv.costPrice} onChange={(e) => setQuick((s) => ({ ...s, [p.id]: { ...qv, costPrice: e.target.value } }))} />
                            <input className={inputBase + " w-20"} placeholder="택배" type="number" value={qv.shippingCost} onChange={(e) => setQuick((s) => ({ ...s, [p.id]: { ...qv, shippingCost: e.target.value } }))} />
                            <input className={inputBase + " w-20"} placeholder="포장" type="number" value={qv.packagingCost} onChange={(e) => setQuick((s) => ({ ...s, [p.id]: { ...qv, packagingCost: e.target.value } }))} />
                            <button className={btnGhost} onClick={() => quickSave(p)}>오늘부터 적용</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && <tr><td colSpan={8}><Empty text="상품 없음" /></td></tr>}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title={`원가 변경 이력 (${costs.length}건)`}>
            <button className={btnGhost} onClick={() => setShowHistory((v) => !v)}>{showHistory ? "접기" : "펼치기"}</button>
            {showHistory && (
              <table className="w-full text-xs mt-3">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-gray-100">
                    <th className="px-2 py-1.5 font-medium">상품</th>
                    <th className="px-2 py-1.5 font-medium text-right">매입가</th>
                    <th className="px-2 py-1.5 font-medium text-right">택배비</th>
                    <th className="px-2 py-1.5 font-medium text-right">포장비</th>
                    <th className="px-2 py-1.5 font-medium">적용일</th>
                    <th className="px-2 py-1.5 font-medium">메모</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {costs.map((c) => (
                    <tr key={c.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-2 py-1.5">{products.find((p) => p.id === c.productId)?.name ?? c.productId}</td>
                      <td className="px-2 py-1.5 text-right">{won(c.costPrice)}</td>
                      <td className="px-2 py-1.5 text-right">{won(c.shippingCost)}</td>
                      <td className="px-2 py-1.5 text-right">{won(c.packagingCost)}</td>
                      <td className="px-2 py-1.5">{fmtDay(c.effectiveFrom)}</td>
                      <td className="px-2 py-1.5 text-gray-500">{c.note}</td>
                      <td className="px-2 py-1.5 text-right"><button className={btnGhost} onClick={() => remove(c.id)}>삭제</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
