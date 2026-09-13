"use client";

/**
 * 스마트스토어(커머스API) 점검 화면.
 *
 * 208건을 한 요청으로 훑으면 타임아웃이 나기 때문에(상품마다 원상품 조회가 필요),
 * 여기서 페이지를 이어서 부르며 진행률을 보여준다.
 */

import { useState } from "react";

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
    </div>
  );
}
