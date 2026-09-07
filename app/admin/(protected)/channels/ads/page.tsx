"use client";

import { useCallback, useEffect, useState } from "react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Card, Empty, Field, inputCls, btnPrimary, btnGhost, fmtDay, todayStr, won, PeriodPicker, periodQuery, type PeriodKey } from "@/components/admin/channels/ui";

type Channel = { id: string; name: string };
type Ad = { id: number; channelId: string; spentOn: string; amount: number; productId: string | null; memo: string };

export default function AdsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [period, setPeriod] = useState<{ period: PeriodKey; from: string; to: string }>({ period: "last30", from: todayStr(), to: todayStr() });
  const [form, setForm] = useState({ channelId: "coupang", spentOn: todayStr(), amount: "", productId: "", memo: "" });
  const [bulk, setBulk] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/channels/ads?${periodQuery(period)}`, { cache: "no-store" });
    const d = await res.json();
    if (d.success) {
      setChannels(d.channels);
      setAds(d.ads);
    }
    setLoading(false);
  }, [period]);
  useEffect(() => {
    load();
  }, [load]);

  const add = async () => {
    setSaving(true);
    setMsg("");
    const res = await fetch("/api/admin/channels/ads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const d = await res.json();
    setSaving(false);
    if (!d.success) return setMsg(d.errorMessage || "저장 실패");
    setMsg("광고비를 저장했습니다.");
    setForm((f) => ({ ...f, amount: "", memo: "" }));
    load();
  };

  /** 여러 줄 붙여넣기: "채널ID 날짜 금액 [메모]" 또는 탭/쉼표 구분 */
  const addBulk = async () => {
    const rows = bulk
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const parts = l.split(/[\t,]+|\s{1,}/).filter(Boolean);
        const [channelId, spentOn, amount, ...memo] = parts;
        return { channelId, spentOn, amount, memo: memo.join(" ") };
      });
    if (!rows.length) return setMsg("붙여넣은 내용이 없습니다.");
    setSaving(true);
    const res = await fetch("/api/admin/channels/ads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rows }) });
    const d = await res.json();
    setSaving(false);
    if (!d.success) return setMsg(d.errorMessage || "저장 실패");
    setMsg(`${d.saved}건 저장했습니다.`);
    setBulk("");
    load();
  };

  const remove = async (id: number) => {
    if (!confirm("삭제할까요?")) return;
    await fetch(`/api/admin/channels/ads?id=${id}`, { method: "DELETE" });
    load();
  };

  const total = ads.reduce((s, a) => s + a.amount, 0);
  const byChannel = channels.map((c) => ({ ...c, sum: ads.filter((a) => a.channelId === c.id).reduce((s, a) => s + a.amount, 0) })).filter((c) => c.sum > 0);

  return (
    <div>
      <AdminPageHeader
        title="광고비"
        description="채널·날짜별 광고비를 입력하면 그날 해당 채널 주문에 매출 비율로 배분되어 순수익에서 차감됩니다. 상품ID를 지정하면 그 상품 주문에만 배분. (API 연동 후엔 쿠팡광고·네이버광고 리포트 자동 수집 예정)"
      />
      {msg && <div className="mb-4 p-3 rounded-lg bg-brand-light text-brand-dark text-sm">{msg}</div>}

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <Card title="광고비 입력">
          <div className="grid grid-cols-2 gap-3">
            <Field label="채널">
              <select className={inputCls} value={form.channelId} onChange={(e) => setForm({ ...form, channelId: e.target.value })}>
                {channels.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="날짜"><input className={inputCls} type="date" value={form.spentOn} onChange={(e) => setForm({ ...form, spentOn: e.target.value })} /></Field>
            <Field label="금액 (원, 부가세 포함)"><input className={inputCls} type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
            <Field label="상품ID (선택)"><input className={inputCls} value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })} placeholder="비우면 채널 전체" /></Field>
          </div>
          <div className="flex gap-3 mt-3 items-end">
            <div className="flex-1"><Field label="메모"><input className={inputCls} value={form.memo} onChange={(e) => setForm({ ...form, memo: e.target.value })} placeholder="예) 쿠팡 매출최적화 캠페인" /></Field></div>
            <button className={btnPrimary} onClick={add} disabled={saving}>저장</button>
          </div>
        </Card>

        <Card title="여러 날 한꺼번에 붙여넣기">
          <textarea
            className={inputCls + " h-32 font-mono text-xs"}
            value={bulk}
            onChange={(e) => setBulk(e.target.value)}
            placeholder={"한 줄에 하나: 채널ID 날짜 금액 메모\ncoupang 2026-09-01 12000 매출최적화\nsmartstore 2026-09-01 5000\n(광고 리포트 엑셀에서 열 3개 복사해 붙여도 됩니다)"}
          />
          <div className="flex justify-between items-center mt-2">
            <span className="text-[11px] text-gray-400">채널ID: {channels.map((c) => c.id).join(", ")}</span>
            <button className={btnPrimary} onClick={addBulk} disabled={saving}>일괄 저장</button>
          </div>
        </Card>
      </div>

      <Card title="광고비 내역">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <PeriodPicker value={period} onChange={setPeriod} />
          <div className="text-sm">
            합계 <b className="text-brand-dark">{won(total)}</b>
            {byChannel.length > 0 && <span className="text-xs text-gray-400 ml-2">({byChannel.map((c) => `${c.name} ${won(c.sum)}`).join(" · ")})</span>}
          </div>
        </div>
        {loading ? (
          <Empty text="불러오는 중..." />
        ) : ads.length === 0 ? (
          <Empty text="이 기간 광고비 없음" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 text-xs border-b border-gray-100">
                <th className="px-3 py-2 font-medium">날짜</th>
                <th className="px-3 py-2 font-medium">채널</th>
                <th className="px-3 py-2 font-medium text-right">금액</th>
                <th className="px-3 py-2 font-medium">상품</th>
                <th className="px-3 py-2 font-medium">메모</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {ads.map((a) => (
                <tr key={a.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-3 py-2">{fmtDay(a.spentOn)}</td>
                  <td className="px-3 py-2">{channels.find((c) => c.id === a.channelId)?.name ?? a.channelId}</td>
                  <td className="px-3 py-2 text-right font-semibold">{won(a.amount)}</td>
                  <td className="px-3 py-2 text-xs text-gray-500">{a.productId ?? <span className="text-gray-300">전체</span>}</td>
                  <td className="px-3 py-2 text-xs text-gray-500">{a.memo}</td>
                  <td className="px-3 py-2 text-right"><button className={btnGhost} onClick={() => remove(a.id)}>삭제</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
