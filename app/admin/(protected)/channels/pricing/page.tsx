"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Card, Empty, Field, inputCls, inputBase, btnPrimary, btnGhost, won, pct, todayStr } from "@/components/admin/channels/ui";

type ChannelState = { channelId: string; channelName: string; price: number; feeRate: number; margin: number; level: "역마진" | "저마진" | "정상"; hasPrice: boolean };
type Rule = { productId: string; targetMarginRate: number; minPrice: number; maxPrice: number; maxChangeRate: number; roundTo: number; roundEndsWith: number; autoSuggest: boolean; seasonStart: string; seasonEnd: string };
type StatusRow = {
  productId: string; productName: string; category: string; unit: string;
  cost: number; costPrice: number; hasCost: boolean;
  rule: Rule; inSeason: boolean; channels: ChannelState[]; worstLevel: "역마진" | "저마진" | "정상";
};
type Suggestion = {
  id: number; batchId: string; channelId: string; productId: string; productName: string;
  currentPrice: number; suggestedPrice: number; costPrice: number; feeRate: number;
  currentMargin: number; suggestedMargin: number; reason: string; capped: string; status: string;
};

const levelCls: Record<string, string> = {
  역마진: "bg-red-100 text-red-700",
  저마진: "bg-amber-100 text-amber-700",
  정상: "bg-gray-100 text-gray-500",
};
const marginCls = (m: number) => (m < 0 ? "text-red-500 font-bold" : m < 0.1 ? "text-amber-600" : "text-brand-dark");

export default function PricingPage() {
  const [rows, setRows] = useState<StatusRow[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const [onlyAlert, setOnlyAlert] = useState(false);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [editing, setEditing] = useState<string | null>(null);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [adjust, setAdjust] = useState({ ratePct: "", effectiveFrom: todayStr(), note: "" });

  const load = useCallback(async () => {
    setLoading(true);
    const [a, b] = await Promise.all([
      fetch("/api/admin/channels/pricing", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/admin/channels/pricing/suggestions?status=대기", { cache: "no-store" }).then((r) => r.json()),
    ]);
    if (a.success) setRows(a.rows);
    if (b.success) setSuggestions(b.suggestions);
    setChecked(new Set());
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const alerts = rows.filter((r) => r.worstLevel !== "정상" && r.hasCost);
  const noCost = rows.filter((r) => !r.hasCost).length;
  const offSeason = rows.filter((r) => !r.inSeason);
  const filtered = rows.filter((r) => (!q || r.productName.includes(q) || r.category.includes(q)) && (!onlyAlert || r.worstLevel !== "정상"));

  // 제안 표에 채널 한글명을 쓰기 위한 매핑 (제안 행에는 채널ID만 저장돼 있음)
  const chNames = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of rows) for (const c of r.channels) m.set(c.channelId, c.channelName);
    return m;
  }, [rows]);

  const suggestionTotal = useMemo(
    () => suggestions.filter((s) => checked.has(s.id)).reduce((acc, s) => acc + (s.suggestedPrice - s.currentPrice), 0),
    [suggestions, checked]
  );

  const call = async (fn: () => Promise<Response>, okMsg: (d: Record<string, unknown>) => string) => {
    setBusy(true); setMsg("");
    try {
      const d = await (await fn()).json();
      if (!d.success) { setMsg(d.errorMessage || "실패했습니다."); return; }
      setMsg(okMsg(d));
      await load();
    } finally { setBusy(false); }
  };

  const generate = () => call(
    () => fetch("/api/admin/channels/pricing/suggestions", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }),
    (d) => (Number(d.created) > 0 ? `가격 제안 ${d.created}건을 만들었습니다. 아래에서 확인 후 승인해주세요.` : "지금 바꿀 가격이 없습니다. 모든 상품이 목표 마진에 맞습니다.")
  );

  const decide = (action: "approve" | "reject") => {
    const ids = Array.from(checked);
    if (!ids.length) { setMsg("제안을 선택해주세요."); return; }
    if (action === "approve" && !confirm(`${ids.length}건의 판매가를 변경합니다. 계속할까요?`)) return;
    return call(
      () => fetch("/api/admin/channels/pricing/suggestions", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids, action }) }),
      (d) => (action === "approve" ? `${d.applied}건 반영했습니다.` : `${d.applied}건 보류했습니다.`)
    );
  };

  const saveRule = (r: StatusRow, patch: Partial<Rule> & { targetMarginPct?: number; maxChangePct?: number }) =>
    call(
      () => fetch("/api/admin/channels/pricing/rules", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: r.productId,
          targetMarginPct: patch.targetMarginPct ?? Math.round(r.rule.targetMarginRate * 100),
          maxChangePct: patch.maxChangePct ?? Math.round(r.rule.maxChangeRate * 100),
          minPrice: patch.minPrice ?? r.rule.minPrice,
          maxPrice: patch.maxPrice ?? r.rule.maxPrice,
          roundTo: patch.roundTo ?? r.rule.roundTo,
          roundEndsWith: patch.roundEndsWith ?? r.rule.roundEndsWith,
          autoSuggest: patch.autoSuggest ?? r.rule.autoSuggest,
          seasonStart: patch.seasonStart ?? r.rule.seasonStart,
          seasonEnd: patch.seasonEnd ?? r.rule.seasonEnd,
        }),
      }),
      () => "가격 규칙을 저장했습니다."
    );

  const bulkAdjust = () => {
    if (!sel.size) { setMsg("조정할 상품을 선택해주세요."); return; }
    return call(
      () => fetch("/api/admin/channels/costs/bulk", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: Array.from(sel), ratePct: Number(adjust.ratePct), effectiveFrom: adjust.effectiveFrom, note: adjust.note }),
      }),
      (d) => `${d.updated}개 상품의 매입가를 조정했습니다. "가격 제안 만들기"를 눌러 판매가를 맞춰주세요.`
    );
  };

  const uploadCosts = (file: File) => {
    const fd = new FormData(); fd.append("file", file);
    return call(
      () => fetch("/api/admin/channels/costs/bulk", { method: "POST", body: fd }),
      (d) => `매입가 ${d.saved}건 반영${Number(d.skipped) ? `, ${d.skipped}줄 건너뜀` : ""}. "가격 제안 만들기"로 판매가를 맞춰주세요.`
    );
  };

  return (
    <div>
      <AdminPageHeader
        title="가격 관리 (시세 대응)"
        description="원물은 시세에 따라 매입가가 계속 바뀝니다. 매입가를 올리면 목표 마진에 맞는 채널별 판매가를 계산해 제안하고, 승인한 것만 반영합니다."
        action={
          <div className="flex gap-2">
            <a href="/api/admin/channels/costs/bulk" className={btnGhost}>원가 엑셀 양식</a>
            <label className={btnGhost + " cursor-pointer"}>
              원가 엑셀 업로드
              <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => e.target.files?.[0] && uploadCosts(e.target.files[0])} />
            </label>
            <button className={btnPrimary + " whitespace-nowrap"} onClick={generate} disabled={busy}>가격 제안 만들기</button>
          </div>
        }
      />
      {msg && <div className="mb-4 p-3 rounded-lg bg-brand-light text-brand-dark text-sm">{msg}</div>}
      {loading && <Empty text="불러오는 중..." />}

      {!loading && (
        <>
          {/* 경보 */}
          <div className="grid md:grid-cols-3 gap-3 mb-6">
            <div className={`rounded-xl p-4 border ${alerts.some((a) => a.worstLevel === "역마진") ? "bg-red-50 border-red-200" : "bg-white border-gray-100"}`}>
              <div className="text-xs text-gray-500">마진 경보</div>
              <div className="text-lg font-bold mt-1">
                역마진 {alerts.filter((a) => a.worstLevel === "역마진").length}개 · 저마진 {alerts.filter((a) => a.worstLevel === "저마진").length}개
              </div>
              <div className="text-[11px] text-gray-400 mt-0.5">팔수록 손해거나 목표 절반 미만</div>
            </div>
            <div className="rounded-xl p-4 border bg-white border-gray-100">
              <div className="text-xs text-gray-500">원가 미입력</div>
              <div className="text-lg font-bold mt-1">{noCost}개</div>
              <div className="text-[11px] text-gray-400 mt-0.5">원가가 없으면 제안을 만들 수 없습니다</div>
            </div>
            <div className="rounded-xl p-4 border bg-white border-gray-100">
              <div className="text-xs text-gray-500">시즌 종료 상품</div>
              <div className="text-lg font-bold mt-1">{offSeason.length}개</div>
              <div className="text-[11px] text-gray-400 mt-0.5">{offSeason.slice(0, 3).map((r) => r.productName).join(", ") || "없음"}</div>
            </div>
          </div>

          {/* 제안 목록 */}
          <Card title={`가격 제안 (승인 대기 ${suggestions.length}건)`} className="mb-6">
            {suggestions.length === 0 ? (
              <Empty text="대기 중인 제안이 없습니다. 매입가를 바꾼 뒤 '가격 제안 만들기'를 눌러주세요." />
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <button className={btnGhost} onClick={() => setChecked(new Set(suggestions.map((s) => s.id)))}>전체 선택</button>
                  <button className={btnGhost} onClick={() => setChecked(new Set())}>선택 해제</button>
                  <span className="text-xs text-gray-500">{checked.size}건 선택{checked.size > 0 && <> · 판매가 합계 변동 <b className={suggestionTotal >= 0 ? "text-brand-dark" : "text-red-500"}>{suggestionTotal >= 0 ? "+" : ""}{won(suggestionTotal)}</b></>}</span>
                  <div className="ml-auto flex gap-2">
                    <button className={btnGhost} onClick={() => decide("reject")} disabled={busy}>보류</button>
                    <button className={btnPrimary} onClick={() => decide("approve")} disabled={busy}>선택 승인 · 판매가 반영</button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-400 text-xs border-b border-gray-100">
                        <th className="px-2 py-2 w-8" />
                        <th className="px-3 py-2 font-medium">상품</th>
                        <th className="px-3 py-2 font-medium">채널</th>
                        <th className="px-3 py-2 font-medium text-right">원가</th>
                        <th className="px-3 py-2 font-medium text-right">현재가</th>
                        <th className="px-3 py-2 font-medium text-right">권장가</th>
                        <th className="px-3 py-2 font-medium text-right">차액</th>
                        <th className="px-3 py-2 font-medium text-right">마진 변화</th>
                        <th className="px-3 py-2 font-medium">사유</th>
                      </tr>
                    </thead>
                    <tbody>
                      {suggestions.map((s) => {
                        const diff = s.suggestedPrice - s.currentPrice;
                        return (
                          <tr key={s.id} className={`border-b border-gray-50 last:border-0 ${checked.has(s.id) ? "bg-brand-light/30" : ""}`}>
                            <td className="px-2 py-2">
                              <input type="checkbox" checked={checked.has(s.id)} onChange={(e) => setChecked((c) => { const n = new Set(c); if (e.target.checked) n.add(s.id); else n.delete(s.id); return n; })} />
                            </td>
                            <td className="px-3 py-2 font-medium">{s.productName}</td>
                            <td className="px-3 py-2 text-xs text-gray-600">{chNames.get(s.channelId) ?? s.channelId}</td>
                            <td className="px-3 py-2 text-right text-gray-500">{won(s.costPrice)}</td>
                            <td className="px-3 py-2 text-right">{s.currentPrice > 0 ? won(s.currentPrice) : <span className="text-gray-300">미설정</span>}</td>
                            <td className="px-3 py-2 text-right font-bold text-brand-dark">{won(s.suggestedPrice)}</td>
                            <td className={`px-3 py-2 text-right ${diff > 0 ? "text-brand-dark" : "text-red-500"}`}>{s.currentPrice > 0 ? `${diff > 0 ? "+" : ""}${won(diff)}` : "-"}</td>
                            <td className="px-3 py-2 text-right text-xs">
                              <span className={marginCls(s.currentMargin)}>{s.currentPrice > 0 ? pct(s.currentMargin) : "-"}</span>
                              <span className="text-gray-300 mx-1">→</span>
                              <span className={marginCls(s.suggestedMargin)}>{pct(s.suggestedMargin)}</span>
                            </td>
                            <td className="px-3 py-2 text-xs text-gray-500">
                              {s.reason}
                              {s.capped && <div className="text-amber-600">⚠️ {s.capped} — 목표 마진에 못 미칩니다</div>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Card>

          {/* 원가 일괄 조정 */}
          <Card title="매입가 일괄 조정 (시세 급등락 대응)" className="mb-6">
            <div className="grid md:grid-cols-5 gap-3 items-end">
              <Field label="조정 비율 % (예: 15 인상, -10 인하)">
                <input className={inputCls} type="number" value={adjust.ratePct} onChange={(e) => setAdjust({ ...adjust, ratePct: e.target.value })} placeholder="15" />
              </Field>
              <Field label="적용시작일"><input className={inputCls} type="date" value={adjust.effectiveFrom} onChange={(e) => setAdjust({ ...adjust, effectiveFrom: e.target.value })} /></Field>
              <div className="md:col-span-2"><Field label="메모"><input className={inputCls} value={adjust.note} onChange={(e) => setAdjust({ ...adjust, note: e.target.value })} placeholder="예) 12월 한파 산지 시세 반영" /></Field></div>
              <button className={btnPrimary} onClick={bulkAdjust} disabled={busy}>{sel.size}개 상품 조정</button>
            </div>
            <p className="text-[11px] text-gray-400 mt-2">아래 표에서 상품을 체크한 뒤 실행하세요. 기존 매입가에 비율을 곱한 새 원가가 이력으로 쌓이고, 과거 주문 계산은 그대로 유지됩니다. 적용시작일을 미래로 두면 그날부터 자동 적용됩니다.</p>
          </Card>

          {/* 상품별 현황 */}
          <Card title="상품별 원가 · 채널 판매가 · 마진">
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <input className={inputBase + " w-64"} placeholder="상품명·카테고리 검색" value={q} onChange={(e) => setQ(e.target.value)} />
              <label className="text-xs text-gray-600 flex items-center gap-1">
                <input type="checkbox" checked={onlyAlert} onChange={(e) => setOnlyAlert(e.target.checked)} /> 마진 경보만
              </label>
              <button className={btnGhost} onClick={() => setSel(new Set(filtered.map((r) => r.productId)))}>보이는 상품 전체 선택</button>
              <button className={btnGhost} onClick={() => setSel(new Set())}>선택 해제</button>
              <span className="text-xs text-gray-400 ml-auto">{filtered.length}개</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 text-xs border-b border-gray-100">
                    <th className="px-2 py-2 w-8" />
                    <th className="px-3 py-2 font-medium">상품</th>
                    <th className="px-3 py-2 font-medium text-right">원가(총)</th>
                    <th className="px-3 py-2 font-medium text-right">목표마진</th>
                    <th className="px-3 py-2 font-medium">채널별 판매가 · 실마진</th>
                    <th className="px-3 py-2 font-medium">시즌</th>
                    <th className="px-3 py-2 font-medium">상태</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <>
                      <tr key={r.productId} className={`border-b border-gray-50 ${!r.hasCost ? "bg-amber-50/40" : ""}`}>
                        <td className="px-2 py-2">
                          <input type="checkbox" checked={sel.has(r.productId)} onChange={(e) => setSel((s) => { const n = new Set(s); if (e.target.checked) n.add(r.productId); else n.delete(r.productId); return n; })} />
                        </td>
                        <td className="px-3 py-2">
                          <div className="font-medium">{r.productName}</div>
                          <div className="text-[10px] text-gray-400">{r.category} · {r.unit}</div>
                        </td>
                        <td className="px-3 py-2 text-right">{r.hasCost ? won(r.cost) : <span className="text-amber-600 text-xs">미입력</span>}</td>
                        <td className="px-3 py-2 text-right text-gray-600">{pct(r.rule.targetMarginRate)}</td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-1.5">
                            {r.channels.filter((c) => c.hasPrice).map((c) => (
                              <span key={c.channelId} className="text-xs bg-gray-50 rounded px-2 py-1 border border-gray-100">
                                {c.channelName} {won(c.price)} <span className={marginCls(c.margin)}>{r.hasCost ? pct(c.margin) : "-"}</span>
                              </span>
                            ))}
                            {r.channels.every((c) => !c.hasPrice) && <span className="text-xs text-gray-300">판매가 미설정</span>}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-500">
                          {r.rule.seasonStart ? `${r.rule.seasonStart} ~ ${r.rule.seasonEnd}` : <span className="text-gray-300">연중</span>}
                          {!r.inSeason && <div className="text-amber-600">시즌 아님</div>}
                        </td>
                        <td className="px-3 py-2"><span className={`text-xs rounded-full px-2 py-1 ${levelCls[r.worstLevel]}`}>{r.hasCost ? r.worstLevel : "원가없음"}</span></td>
                        <td className="px-3 py-2 text-right"><button className={btnGhost} onClick={() => setEditing(editing === r.productId ? null : r.productId)}>규칙</button></td>
                      </tr>
                      {editing === r.productId && (
                        <tr key={r.productId + "-e"} className="bg-gray-50/60">
                          <td colSpan={8} className="px-4 py-3"><RuleEditor row={r} onSave={(p) => saveRule(r, p)} busy={busy} /></td>
                        </tr>
                      )}
                    </>
                  ))}
                  {filtered.length === 0 && <tr><td colSpan={8}><Empty text="상품 없음" /></td></tr>}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function RuleEditor({ row, onSave, busy }: { row: StatusRow; onSave: (p: Record<string, unknown>) => void; busy: boolean }) {
  const [f, setF] = useState({
    targetMarginPct: String(Math.round(row.rule.targetMarginRate * 100)),
    maxChangePct: String(Math.round(row.rule.maxChangeRate * 100)),
    minPrice: String(row.rule.minPrice),
    maxPrice: String(row.rule.maxPrice),
    roundTo: String(row.rule.roundTo),
    roundEndsWith: String(row.rule.roundEndsWith),
    autoSuggest: row.rule.autoSuggest,
    seasonStart: row.rule.seasonStart,
    seasonEnd: row.rule.seasonEnd,
  });
  return (
    <div>
      <div className="grid md:grid-cols-4 lg:grid-cols-8 gap-3 items-end">
        <Field label="목표 순마진 %"><input className={inputCls} type="number" value={f.targetMarginPct} onChange={(e) => setF({ ...f, targetMarginPct: e.target.value })} /></Field>
        <Field label="1회 최대 변동 %"><input className={inputCls} type="number" value={f.maxChangePct} onChange={(e) => setF({ ...f, maxChangePct: e.target.value })} /></Field>
        <Field label="최저 판매가"><input className={inputCls} type="number" value={f.minPrice} onChange={(e) => setF({ ...f, minPrice: e.target.value })} /></Field>
        <Field label="최고 판매가"><input className={inputCls} type="number" value={f.maxPrice} onChange={(e) => setF({ ...f, maxPrice: e.target.value })} /></Field>
        <Field label="끝자리 단위"><input className={inputCls} type="number" value={f.roundTo} onChange={(e) => setF({ ...f, roundTo: e.target.value })} /></Field>
        <Field label="끝자리 값"><input className={inputCls} type="number" value={f.roundEndsWith} onChange={(e) => setF({ ...f, roundEndsWith: e.target.value })} /></Field>
        <Field label="시즌 시작 (MM-DD)"><input className={inputCls} value={f.seasonStart} onChange={(e) => setF({ ...f, seasonStart: e.target.value })} placeholder="09-01" /></Field>
        <Field label="시즌 종료 (MM-DD)"><input className={inputCls} value={f.seasonEnd} onChange={(e) => setF({ ...f, seasonEnd: e.target.value })} placeholder="12-31" /></Field>
      </div>
      <div className="flex items-center gap-3 mt-3">
        <label className="text-xs text-gray-600 flex items-center gap-1">
          <input type="checkbox" checked={f.autoSuggest} onChange={(e) => setF({ ...f, autoSuggest: e.target.checked })} /> 가격 제안 대상에 포함
        </label>
        <button className={btnPrimary} onClick={() => onSave({ ...f, targetMarginPct: Number(f.targetMarginPct), maxChangePct: Number(f.maxChangePct), minPrice: Number(f.minPrice), maxPrice: Number(f.maxPrice), roundTo: Number(f.roundTo), roundEndsWith: Number(f.roundEndsWith) })} disabled={busy}>규칙 저장</button>
        <span className="text-[11px] text-gray-400">
          판매가 = 원가 ÷ (1 − 채널수수료율 − 목표마진율), 끝자리 정리 후 변동폭·최저/최고가 제한 적용
        </span>
      </div>
    </div>
  );
}
