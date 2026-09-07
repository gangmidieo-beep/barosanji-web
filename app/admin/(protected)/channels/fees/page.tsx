"use client";

import { useCallback, useEffect, useState } from "react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Card, Empty, Field, inputCls, inputBase, btnPrimary, btnGhost, fmtDay, todayStr, won } from "@/components/admin/channels/ui";

type Channel = { id: string; name: string; enabled: boolean; monthlyFee: number; monthlyFeeThreshold: number; settlementNote: string; settlementDays: number; apiStatus: string };
type Rule = { id: number; channelId: string; category: string; saleRate: number; paymentRate: number; vatOnFee: boolean; effectiveFrom: string; note: string };

const API_STATUSES = ["미연동", "가입·심사중", "키 발급완료", "연동완료", "자사몰"];

export default function FeesPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({ channelId: "coupang", category: "*", salePct: "10", paymentPct: "2.9", vatOnFee: true, effectiveFrom: todayStr(), note: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/channels/fees", { cache: "no-store" });
    const d = await res.json();
    if (d.success) {
      setChannels(d.channels);
      setRules(d.rules);
    }
    setLoading(false);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const addRule = async () => {
    setSaving(true);
    setMsg("");
    const res = await fetch("/api/admin/channels/fees", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const d = await res.json();
    setSaving(false);
    if (!d.success) return setMsg(d.errorMessage || "저장 실패");
    setMsg("수수료 규칙을 추가했습니다.");
    load();
  };

  const removeRule = async (id: number) => {
    if (!confirm("이 수수료 규칙을 삭제할까요? 과거 주문 계산에도 영향이 있습니다.")) return;
    await fetch(`/api/admin/channels/fees?id=${id}`, { method: "DELETE" });
    load();
  };

  const saveChannel = async (c: Channel) => {
    await fetch("/api/admin/channels/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(c) });
    setMsg(`${c.name} 설정을 저장했습니다.`);
  };

  const updateCh = (id: string, patch: Partial<Channel>) => setChannels((list) => list.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  return (
    <div>
      <AdminPageHeader
        title="수수료 · 채널 설정"
        description="채널별 판매수수료·결제수수료·부가세 적용 여부와 월 고정비, 정산일수를 관리합니다. 수수료율은 적용시작일 기준으로 이력이 남아 과거 주문 계산이 바뀌지 않습니다."
      />
      {msg && <div className="mb-4 p-3 rounded-lg bg-brand-light text-brand-dark text-sm">{msg}</div>}
      {loading && <Empty text="불러오는 중..." />}

      {!loading && (
        <>
          <Card title="수수료 규칙 추가" className="mb-6">
            <div className="grid md:grid-cols-7 gap-3 items-end">
              <Field label="채널">
                <select className={inputCls} value={form.channelId} onChange={(e) => setForm({ ...form, channelId: e.target.value })}>
                  {channels.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="카테고리 (* = 전체)">
                <input className={inputCls} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="* 또는 과일, 채소…" />
              </Field>
              <Field label="판매수수료 %">
                <input className={inputCls} type="number" step="0.01" value={form.salePct} onChange={(e) => setForm({ ...form, salePct: e.target.value })} />
              </Field>
              <Field label="결제수수료 %">
                <input className={inputCls} type="number" step="0.01" value={form.paymentPct} onChange={(e) => setForm({ ...form, paymentPct: e.target.value })} />
              </Field>
              <Field label="수수료에 부가세 별도">
                <select className={inputCls} value={form.vatOnFee ? "1" : "0"} onChange={(e) => setForm({ ...form, vatOnFee: e.target.value === "1" })}>
                  <option value="1">예 (쿠팡 등)</option>
                  <option value="0">아니오 (포함)</option>
                </select>
              </Field>
              <Field label="적용시작일">
                <input className={inputCls} type="date" value={form.effectiveFrom} onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })} />
              </Field>
              <button className={btnPrimary} onClick={addRule} disabled={saving}>{saving ? "저장 중…" : "추가"}</button>
            </div>
            <div className="mt-3">
              <Field label="메모">
                <input className={inputCls} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="예) 2026-10 수수료 인상 반영" />
              </Field>
            </div>
            <p className="text-[11px] text-gray-400 mt-2">
              카테고리는 상품관리의 카테고리명과 같게 입력하면 해당 상품에 우선 적용되고, 없으면 * 규칙이 적용됩니다. 결제수수료가 판매수수료에 포함된 채널(스마트스토어)은 결제수수료 0으로.
            </p>
          </Card>

          <Card title="수수료 규칙 목록" className="mb-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 text-xs border-b border-gray-100">
                    <th className="px-3 py-2 font-medium">채널</th>
                    <th className="px-3 py-2 font-medium">카테고리</th>
                    <th className="px-3 py-2 font-medium text-right">판매수수료</th>
                    <th className="px-3 py-2 font-medium text-right">결제수수료</th>
                    <th className="px-3 py-2 font-medium">부가세</th>
                    <th className="px-3 py-2 font-medium text-right">실질 합계</th>
                    <th className="px-3 py-2 font-medium">적용시작</th>
                    <th className="px-3 py-2 font-medium">메모</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {rules.map((r) => {
                    const total = (r.saleRate + r.paymentRate) * (r.vatOnFee ? 1.1 : 1);
                    return (
                      <tr key={r.id} className="border-b border-gray-50 last:border-0">
                        <td className="px-3 py-2 font-medium">{channels.find((c) => c.id === r.channelId)?.name ?? r.channelId}</td>
                        <td className="px-3 py-2">{r.category === "*" ? <span className="text-gray-400">전체</span> : r.category}</td>
                        <td className="px-3 py-2 text-right">{(r.saleRate * 100).toFixed(2)}%</td>
                        <td className="px-3 py-2 text-right">{(r.paymentRate * 100).toFixed(2)}%</td>
                        <td className="px-3 py-2 text-xs">{r.vatOnFee ? "별도 +10%" : "포함"}</td>
                        <td className="px-3 py-2 text-right font-semibold text-brand-dark">{(total * 100).toFixed(2)}%</td>
                        <td className="px-3 py-2 text-xs text-gray-500">{fmtDay(r.effectiveFrom)}</td>
                        <td className="px-3 py-2 text-xs text-gray-500">{r.note}</td>
                        <td className="px-3 py-2 text-right"><button className={btnGhost} onClick={() => removeRule(r.id)}>삭제</button></td>
                      </tr>
                    );
                  })}
                  {rules.length === 0 && <tr><td colSpan={9}><Empty text="규칙 없음" /></td></tr>}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title="채널 설정 (월 고정비 · 정산일수 · API 연동 상태)">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 text-xs border-b border-gray-100">
                    <th className="px-3 py-2 font-medium">채널</th>
                    <th className="px-3 py-2 font-medium">사용</th>
                    <th className="px-3 py-2 font-medium">월 고정비</th>
                    <th className="px-3 py-2 font-medium">고정비 기준 월매출</th>
                    <th className="px-3 py-2 font-medium">정산일수</th>
                    <th className="px-3 py-2 font-medium">정산 메모</th>
                    <th className="px-3 py-2 font-medium">API 상태</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {channels.map((c) => (
                    <tr key={c.id} className="border-b border-gray-50 last:border-0 align-top">
                      <td className="px-3 py-2 font-medium whitespace-nowrap">{c.name}<div className="text-[10px] text-gray-400 font-normal">{c.id}</div></td>
                      <td className="px-3 py-2"><input type="checkbox" checked={c.enabled} onChange={(e) => updateCh(c.id, { enabled: e.target.checked })} /></td>
                      <td className="px-3 py-2"><input className={inputBase + " w-28"} type="number" value={c.monthlyFee} onChange={(e) => updateCh(c.id, { monthlyFee: Number(e.target.value) })} /></td>
                      <td className="px-3 py-2"><input className={inputBase + " w-32"} type="number" value={c.monthlyFeeThreshold} onChange={(e) => updateCh(c.id, { monthlyFeeThreshold: Number(e.target.value) })} /></td>
                      <td className="px-3 py-2"><input className={inputBase + " w-20"} type="number" value={c.settlementDays} onChange={(e) => updateCh(c.id, { settlementDays: Number(e.target.value) })} /></td>
                      <td className="px-3 py-2"><input className={inputCls + " min-w-64"} value={c.settlementNote} onChange={(e) => updateCh(c.id, { settlementNote: e.target.value })} /></td>
                      <td className="px-3 py-2">
                        <select className={inputCls} value={c.apiStatus} onChange={(e) => updateCh(c.id, { apiStatus: e.target.value })}>
                          {(API_STATUSES.includes(c.apiStatus) ? API_STATUSES : [c.apiStatus, ...API_STATUSES]).map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2"><button className={btnPrimary} onClick={() => saveChannel(c)}>저장</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-gray-400 mt-2">
              월 고정비는 그 달 채널 매출이 기준 이상일 때만 부과되어 그 달 주문에 균등 배분됩니다 (쿠팡: 월매출 100만 원 이상 시 {won(55000)}). 정산일수는 주문일 기준 며칠 뒤 입금되는지의 대략치입니다.
            </p>
          </Card>
        </>
      )}
    </div>
  );
}
