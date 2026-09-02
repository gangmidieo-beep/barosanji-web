"use client";

import { useEffect, useMemo, useState } from "react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";

type AppUser = {
  kakaoId: string;
  nickname: string;
  email: string;
  phone: string;
  receiverName: string;
  receiverAddress: string;
  createdAt: string;
  lastLoginAt: string;
};

function fmtDate(iso: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return `${kst.getUTCFullYear()}-${String(kst.getUTCMonth() + 1).padStart(2, "0")}-${String(
    kst.getUTCDate()
  ).padStart(2, "0")}`;
}

export default function UsersAdminPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setUsers(data.users);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () =>
      users.filter(
        (u) =>
          !query ||
          u.nickname.includes(query) ||
          u.email.includes(query) ||
          u.phone.includes(query)
      ),
    [users, query]
  );

  return (
    <div>
      <AdminPageHeader title="회원 관리" description="카카오 로그인으로 가입한 회원 목록입니다." />

      <div className="flex items-center gap-2 mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="이름/이메일/연락처 검색"
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-56"
        />
        <span className="text-xs text-gray-400">총 {users.length}명</span>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 text-xs border-b border-gray-100">
              <th className="px-4 py-3 font-medium">회원</th>
              <th className="px-4 py-3 font-medium">이메일</th>
              <th className="px-4 py-3 font-medium">연락처</th>
              <th className="px-4 py-3 font-medium">가입일</th>
              <th className="px-4 py-3 font-medium">최근 로그인</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr
                key={u.kakaoId}
                className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-full bg-brand-light text-brand-dark font-semibold flex items-center justify-center text-xs">
                      {u.nickname.slice(0, 1) || "?"}
                    </span>
                    <span className="text-gray-800 font-medium">{u.nickname || "카카오 회원"}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500">{u.email || "-"}</td>
                <td className="px-4 py-3 text-gray-500">{u.phone || "-"}</td>
                <td className="px-4 py-3 text-gray-400">{fmtDate(u.createdAt)}</td>
                <td className="px-4 py-3 text-gray-400">{fmtDate(u.lastLoginAt)}</td>
              </tr>
            ))}
            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-gray-400">
                  불러오는 중...
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-gray-400">
                  {users.length === 0 ? "아직 가입한 회원이 없습니다." : "검색 결과가 없습니다."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
