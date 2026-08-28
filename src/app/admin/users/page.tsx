"use client";

import { useMemo, useState } from "react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { buildMockUsers, type MockUser } from "@/lib/dashboard-data";

export default function UsersAdminPage() {
  const [users] = useState<MockUser[]>(() => buildMockUsers(24));
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () => users.filter((u) => !query || u.name.includes(query) || u.email.includes(query)),
    [users, query]
  );

  return (
    <div>
      <AdminPageHeader title="회원 관리" description="가입한 회원 목록을 확인합니다." />

      <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg px-4 py-3 mb-5">
        ⚠️ 데모 화면입니다 — 아래 목록은 예시 데이터입니다. 실제 서비스에서는 회원 DB(가입/로그인)와
        연결해야 합니다.
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="이름/이메일 검색"
        className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-56 mb-4"
      />

      <div className="bg-white border border-gray-100 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 text-xs border-b border-gray-100">
              <th className="px-4 py-3 font-medium">회원</th>
              <th className="px-4 py-3 font-medium">이메일</th>
              <th className="px-4 py-3 font-medium">가입일</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u, i) => (
              <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-full bg-brand-light text-brand-dark font-semibold flex items-center justify-center text-xs">
                      {u.initial}
                    </span>
                    <span className="text-gray-800 font-medium">{u.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500">{u.email}</td>
                <td className="px-4 py-3 text-gray-400">{u.dateLabel}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-10 text-center text-gray-400">
                  검색 결과가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
