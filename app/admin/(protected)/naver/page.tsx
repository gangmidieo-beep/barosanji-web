"use client";

/**
 * 스마트스토어(커머스API) 점검 화면.
 *
 * 208건을 한 요청으로 훑으면 타임아웃이 나기 때문에(상품마다 원상품 조회가 필요),
 * 여기서 페이지를 이어서 부르며 진행률을 보여준다.
 */

import { useEffect, useState } from "react";

type KeywordIssue = { level: "error" | "warn"; field: string; message: string };

type Row = {
  originProductNo: number;
  name: string;
  categoryName?: string;
  brandName?: string;
  manufacturerName?: string;
  attributeCount?: number;
  catalogMatched?: boolean;
  tags?: string[];
  keywordIssues?: KeywordIssue[];
  error?: string;
};

type Mapping = {
  id: number;
  externalOptionCode: string;
  externalProductId: string;
  externalOptionName: string;
  productId: string;
  optionLabel: string;
};

type AdminProduct = { id: string; name: string; options?: { label: string }[] | null };

type CollectDetail = { productOrderId: string; 상품명: string; 옵션: string; 상태: string; 메모: string };

type CollectResult = {
  ok: boolean;
  errorMessage?: string;
  힌트?: string;
  dryRun?: boolean;
  조회구간?: { from: string; to: string };
  조회건수?: number;
  신규저장?: number;
  발주성공?: number;
  발주실패?: number;
  매칭필요?: number;
  상세?: CollectDetail[];
};

type CheckResult = {
  ok: boolean;
  단계?: string;
  메시지?: string;
  이_서버의_호출_IP?: string | null;
  해야할_일?: string;
};

export default function NaverPage() {
  const [check, setCheck] = useState<CheckResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [progress, setProgress] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [adminProducts, setAdminProducts] = useState<AdminProduct[]>([]);
  const [mapForm, setMapForm] = useState({
    externalOptionCode: "",
    externalProductId: "",
    externalOptionName: "",
    productId: "",
    optionLabel: "",
  });
  const [collect, setCollect] = useState<CollectResult | null>(null);
  const [collecting, setCollecting] = useState(false);

  const loadMappings = async () => {
    const [m, p] = await Promise.all([
      fetch("/api/admin/naver/mappings").then((r) => r.json()).catch(() => null),
      fetch("/api/admin/products").then((r) => r.json()).catch(() => null),
    ]);
    if (m?.success) setMappings(m.mappings);
    if (p?.success ?? p?.products) setAdminProducts(p.products ?? []);
  };

  const addMapping = async () => {
    if (!mapForm.productId) return alert("바로산지 상품을 선택해주세요.");
    if (!mapForm.externalOptionCode && !mapForm.externalProductId)
      return alert("옵션 관리코드나 스마트스토어 상품번호 중 하나는 입력해주세요.");
    const res = await fetch("/api/admin/naver/mappings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mapForm),
    });
    const data = await res.json();
    if (!data.success) return alert(data.errorMessage ?? "저장하지 못했습니다.");
    setMapForm({ externalOptionCode: "", externalProductId: "", externalOptionName: "", productId: "", optionLabel: "" });
    loadMappings();
  };

  const removeMapping = async (id: number) => {
    if (!confirm("이 매칭을 삭제할까요?")) return;
    await fetch(`/api/admin/naver/mappings?id=${id}`, { method: "DELETE" });
    loadMappings();
  };

  // 화면을 열면 매칭표와 상품 목록을 한 번 받아온다.
  // (effect 본문에서 곧바로 setState 하지 않도록, 응답이 온 뒤에만 반영한다)
  useEffect(() => {
    let alive = true;
    void (async () => {
      const [m, prod] = await Promise.all([
        fetch("/api/admin/naver/mappings").then((r) => r.json()).catch(() => null),
        fetch("/api/admin/products").then((r) => r.json()).catch(() => null),
      ]);
      if (!alive) return;
      if (m?.success) setMappings(m.mappings);
      if (prod?.products) setAdminProducts(prod.products);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const runCollect = async (dryRun: boolean) => {
    setCollecting(true);
    setCollect(null);
    try {
      const res = await fetch(`/api/admin/naver/orders?hours=24${dryRun ? "&dryRun=1" : ""}`);
      setCollect(await res.json());
    } catch {
      setCollect({ ok: false, errorMessage: "서버에 연결하지 못했습니다." });
    } finally {
      setCollecting(false);
    }
  };

  const runCheck = async () => {
    setChecking(true);
    setCheck(null);
    try {
      const res = await fetch("/api/admin/naver/check");
      setCheck(await res.json());
    } catch {
      setCheck({ ok: false, 메시지: "서버에 연결하지 못했습니다." });
    } finally {
      setChecking(false);
    }
  };

  const runAudit = async () => {
    setRunning(true);
    setRows([]);
    setError("");
    setProgress("시작하는 중...");
    const collected: Row[] = [];
    try {
      for (let page = 1; ; page++) {
        const res = await fetch(`/api/admin/naver/audit?page=${page}&size=20`);
        const data = await res.json();
        if (!data.ok) {
          setError(`${data.errorMessage ?? "조회 실패"}${data.힌트 ? ` — ${data.힌트}` : ""}`);
          break;
        }
        collected.push(...(data.rows ?? []));
        setRows([...collected]);
        setProgress(`${data.진행} 조회 완료`);
        if (!data.hasMore) {
          setProgress(`전체 ${data.total}건 조회 완료`);
          break;
        }
      }
    } catch {
      setError("조회 중 통신 오류가 발생했습니다.");
    } finally {
      setRunning(false);
    }
  };

  const missingBrand = rows.filter((r) => !r.error && !r.brandName).length;
  const missingManufacturer = rows.filter((r) => !r.error && !r.manufacturerName).length;
  const missingAttributes = rows.filter((r) => !r.error && (r.attributeCount ?? 0) === 0).length;
  const keywordErrors = rows.filter((r) => r.keywordIssues?.some((i) => i.level === "error")).length;

  const downloadCsv = () => {
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const header = ["상품번호", "상품명", "카테고리", "브랜드", "제조사", "속성수", "카탈로그매칭", "태그", "키워드문제"];
    const lines = rows.map((r) =>
      [
        r.originProductNo,
        r.name,
        r.categoryName,
        r.brandName,
        r.manufacturerName,
        r.attributeCount,
        r.catalogMatched ? "Y" : "N",
        (r.tags ?? []).join(" "),
        (r.keywordIssues ?? []).map((i) => `[${i.level === "error" ? "고침필요" : "권장"}] ${i.field}: ${i.message}`).join(" / "),
      ].map(esc).join(",")
    );
    const blob = new Blob(["﻿" + [header.map(esc).join(","), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `스마트스토어_점검_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 max-w-6xl">
      <h1 className="text-lg font-bold text-gray-900 mb-1">스마트스토어 점검</h1>
      <p className="text-xs text-gray-500 mb-6">
        커머스API로 등록정보(브랜드·제조사·속성)와 키워드(상품명·태그) 상태를 확인합니다.
      </p>

      {/* 1단계: 연결 확인 */}
      <section className="bg-white border border-gray-100 rounded-xl p-5 mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold text-gray-800">1. 연결 확인</h2>
          <button
            onClick={runCheck}
            disabled={checking}
            className="bg-gray-700 hover:bg-gray-600 text-white text-xs rounded px-3 py-1.5 font-medium disabled:opacity-60"
          >
            {checking ? "확인 중..." : "연결 확인"}
          </button>
        </div>
        <p className="text-[11px] text-gray-400 mb-3">
          커머스API는 등록된 IP에서만 호출됩니다. 실패하면 아래 표시되는 이 서버의 IP를
          커머스API센터 &gt; 애플리케이션 &gt; API호출 IP 에 등록해주세요 (최대 3개).
        </p>
        {check && (
          <div
            className={`text-xs rounded-lg px-4 py-3 ${
              check.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"
            }`}
          >
            <p className="font-semibold">{check.ok ? "✓ 연결 정상" : `✗ 실패 — ${check.단계}`}</p>
            <p className="mt-1">{check.메시지}</p>
            {check.이_서버의_호출_IP && (
              <p className="mt-2">
                이 서버의 호출 IP: <span className="font-mono font-bold">{check.이_서버의_호출_IP}</span>
              </p>
            )}
            {check.해야할_일 && <p className="mt-1">{check.해야할_일}</p>}
          </div>
        )}
      </section>

      {/* 2단계: 전체 점검 */}
      <section className="bg-white border border-gray-100 rounded-xl p-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold text-gray-800">2. 전체 상품 점검</h2>
          <div className="flex gap-2">
            {rows.length > 0 && (
              <button
                onClick={downloadCsv}
                className="bg-white border border-gray-200 text-gray-700 text-xs rounded px-3 py-1.5 font-medium"
              >
                CSV 내려받기
              </button>
            )}
            <button
              onClick={runAudit}
              disabled={running}
              className="bg-brand hover:bg-brand-dark text-white text-xs rounded px-3 py-1.5 font-medium disabled:opacity-60"
            >
              {running ? "조회 중..." : "전체 점검 시작"}
            </button>
          </div>
        </div>
        <p className="text-[11px] text-gray-400 mb-3">
          읽기만 합니다 — 상품을 수정하지 않습니다. 상품 수가 많으면 몇 분 걸립니다.
        </p>

        {progress && <p className="text-xs text-gray-600 mb-2">{progress}</p>}
        {error && <p className="text-xs text-red-600 bg-red-50 rounded px-3 py-2 mb-2">{error}</p>}

        {rows.length > 0 && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
              {[
                ["브랜드 미등록", missingBrand],
                ["제조사 미등록", missingManufacturer],
                ["속성 미등록", missingAttributes],
                ["상품명·카테고리 문제", keywordErrors],
              ].map(([label, n]) => (
                <div key={String(label)} className="bg-gray-50 rounded-lg px-3 py-2">
                  <p className="text-[11px] text-gray-500">{label}</p>
                  <p className="text-base font-bold text-gray-900">{n as number}건</p>
                </div>
              ))}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-gray-100">
                    <th className="px-2 py-2 font-medium">상품명</th>
                    <th className="px-2 py-2 font-medium">브랜드</th>
                    <th className="px-2 py-2 font-medium">제조사</th>
                    <th className="px-2 py-2 font-medium">속성</th>
                    <th className="px-2 py-2 font-medium">태그</th>
                    <th className="px-2 py-2 font-medium">키워드 점검</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.originProductNo} className="border-b border-gray-50 align-top">
                      <td className="px-2 py-2 text-gray-800 min-w-[200px]">
                        {r.name}
                        {r.categoryName && <p className="text-[10px] text-gray-400">{r.categoryName}</p>}
                        {r.error && <p className="text-[10px] text-red-500">조회 실패: {r.error}</p>}
                      </td>
                      <td className="px-2 py-2">
                        {r.brandName || <span className="text-red-500">미등록</span>}
                      </td>
                      <td className="px-2 py-2">
                        {r.manufacturerName || <span className="text-red-500">미등록</span>}
                      </td>
                      <td className="px-2 py-2">
                        {(r.attributeCount ?? 0) > 0 ? `${r.attributeCount}개` : <span className="text-red-500">없음</span>}
                      </td>
                      <td className="px-2 py-2">{r.tags?.length ?? 0}개</td>
                      <td className="px-2 py-2 min-w-[260px]">
                        {(r.keywordIssues ?? []).length === 0 ? (
                          <span className="text-gray-400">문제 없음</span>
                        ) : (
                          <ul className="space-y-0.5">
                            {r.keywordIssues!.map((i, n) => (
                              <li key={n} className={i.level === "error" ? "text-red-600" : "text-amber-600"}>
                                {i.level === "error" ? "[고침필요] " : "[권장] "}
                                {i.field}: {i.message}
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {/* 3단계: 주문 자동수집 */}
      <section className="bg-white border border-gray-100 rounded-xl p-5 mt-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold text-gray-800">3. 스마트스토어 주문 수집 · 자동발주</h2>
          <div className="flex gap-2">
            <button
              onClick={() => runCollect(true)}
              disabled={collecting}
              className="bg-white border border-gray-200 text-gray-700 text-xs rounded px-3 py-1.5 font-medium disabled:opacity-60"
            >
              시뮬레이션
            </button>
            <button
              onClick={() => runCollect(false)}
              disabled={collecting}
              className="bg-brand hover:bg-brand-dark text-white text-xs rounded px-3 py-1.5 font-medium disabled:opacity-60"
            >
              {collecting ? "수집 중..." : "지금 수집 + 발주"}
            </button>
          </div>
        </div>
        <p className="text-[11px] text-gray-400 mb-3">
          최근 24시간 주문을 가져와 아래 매칭표대로 공급사에 발주합니다. 같은 주문은 여러 번 수집해도
          발주가 중복되지 않습니다. <b>시뮬레이션</b>은 저장만 하고 발주는 보내지 않습니다.
        </p>

        {collect && !collect.ok && (
          <p className="text-xs text-red-600 bg-red-50 rounded px-3 py-2">
            {collect.errorMessage}
            {collect.힌트 ? ` — ${collect.힌트}` : ""}
          </p>
        )}
        {collect?.ok && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3">
              {[
                ["조회", collect.조회건수],
                ["신규", collect.신규저장],
                ["발주성공", collect.발주성공],
                ["발주실패", collect.발주실패],
                ["매칭필요", collect.매칭필요],
              ].map(([label, n]) => (
                <div key={String(label)} className="bg-gray-50 rounded-lg px-3 py-2">
                  <p className="text-[11px] text-gray-500">{label}</p>
                  <p className="text-base font-bold text-gray-900">{(n as number) ?? 0}건</p>
                </div>
              ))}
            </div>
            {(collect.상세?.length ?? 0) > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-gray-400 border-b border-gray-100">
                      <th className="px-2 py-2 font-medium">상품주문번호</th>
                      <th className="px-2 py-2 font-medium">상품 / 옵션</th>
                      <th className="px-2 py-2 font-medium">결과</th>
                      <th className="px-2 py-2 font-medium">메모</th>
                    </tr>
                  </thead>
                  <tbody>
                    {collect.상세!.map((d) => (
                      <tr key={d.productOrderId} className="border-b border-gray-50 align-top">
                        <td className="px-2 py-2 font-mono text-[11px]">{d.productOrderId}</td>
                        <td className="px-2 py-2">
                          {d.상품명}
                          {d.옵션 && <span className="text-gray-400"> / {d.옵션}</span>}
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap">
                          <span
                            className={`inline-block text-[11px] font-semibold px-2 py-1 rounded ${
                              d.상태 === "발주완료"
                                ? "bg-green-50 text-green-700"
                                : d.상태 === "발주실패"
                                  ? "bg-red-50 text-red-600"
                                  : d.상태 === "매칭필요"
                                    ? "bg-amber-50 text-amber-700"
                                    : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {d.상태}
                          </span>
                        </td>
                        <td className="px-2 py-2 text-gray-500 min-w-[240px]">{d.메모}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>

      {/* 매칭표 */}
      <section className="bg-white border border-gray-100 rounded-xl p-5 mt-4">
        <h2 className="text-sm font-bold text-gray-800 mb-1">상품 매칭표</h2>
        <p className="text-[11px] text-gray-400 mb-3">
          스마트스토어 주문이 바로산지의 어느 상품인지 알려주는 표입니다. 여기에 없으면 발주가 나가지 않고
          <b> 매칭필요</b>로 남습니다. <b>옵션 관리코드</b>를 넣는 게 가장 정확하고, 없으면
          <b> 상품번호 + 옵션명</b>으로 맞춥니다.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end bg-gray-50 rounded-lg p-3 mb-4">
          <div>
            <label className="text-[11px] text-gray-500 block mb-1">옵션 관리코드</label>
            <input
              value={mapForm.externalOptionCode}
              onChange={(e) => setMapForm((f) => ({ ...f, externalOptionCode: e.target.value }))}
              placeholder="권장"
              className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs"
            />
          </div>
          <div>
            <label className="text-[11px] text-gray-500 block mb-1">스마트스토어 상품번호</label>
            <input
              value={mapForm.externalProductId}
              onChange={(e) => setMapForm((f) => ({ ...f, externalProductId: e.target.value }))}
              className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs"
            />
          </div>
          <div>
            <label className="text-[11px] text-gray-500 block mb-1">옵션명 (선택)</label>
            <input
              value={mapForm.externalOptionName}
              onChange={(e) => setMapForm((f) => ({ ...f, externalOptionName: e.target.value }))}
              className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs"
            />
          </div>
          <div>
            <label className="text-[11px] text-gray-500 block mb-1">바로산지 상품</label>
            <select
              value={mapForm.productId}
              onChange={(e) => setMapForm((f) => ({ ...f, productId: e.target.value, optionLabel: "" }))}
              className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs"
            >
              <option value="">선택</option>
              {adminProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] text-gray-500 block mb-1">바로산지 옵션</label>
            <select
              value={mapForm.optionLabel}
              onChange={(e) => setMapForm((f) => ({ ...f, optionLabel: e.target.value }))}
              className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs"
            >
              <option value="">옵션 없음</option>
              {adminProducts
                .find((p) => p.id === mapForm.productId)
                ?.options?.map((o) => (
                  <option key={o.label} value={o.label}>
                    {o.label}
                  </option>
                ))}
            </select>
          </div>
          <button
            onClick={addMapping}
            className="bg-gray-700 hover:bg-gray-600 text-white text-xs rounded px-3 py-2 font-medium"
          >
            매칭 추가
          </button>
        </div>

        {mappings.length === 0 ? (
          <p className="text-xs text-gray-400">아직 매칭이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-100">
                  <th className="px-2 py-2 font-medium">관리코드</th>
                  <th className="px-2 py-2 font-medium">상품번호</th>
                  <th className="px-2 py-2 font-medium">옵션명</th>
                  <th className="px-2 py-2 font-medium">바로산지 상품</th>
                  <th className="px-2 py-2 font-medium">옵션</th>
                  <th className="px-2 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {mappings.map((m) => (
                  <tr key={m.id} className="border-b border-gray-50">
                    <td className="px-2 py-2 font-mono text-[11px]">{m.externalOptionCode || "-"}</td>
                    <td className="px-2 py-2 font-mono text-[11px]">{m.externalProductId || "-"}</td>
                    <td className="px-2 py-2">{m.externalOptionName || "-"}</td>
                    <td className="px-2 py-2">
                      {adminProducts.find((p) => p.id === m.productId)?.name ?? m.productId}
                    </td>
                    <td className="px-2 py-2">{m.optionLabel || "-"}</td>
                    <td className="px-2 py-2 text-right">
                      <button onClick={() => removeMapping(m.id)} className="text-gray-400 hover:text-red-500">
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
