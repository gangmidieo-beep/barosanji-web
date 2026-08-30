"use client";

import Link from "next/link";
import { usePoints } from "@/lib/points-context";

const mockOrders = [
  { id: "ORD-20260825-01", date: "2026-08-25", name: "경북 청송 꿀사과 (5kg/특) 외 1건", price: 42800, status: "배송중" },
  { id: "ORD-20260810-02", date: "2026-08-10", name: "완도 활전복 (특大 10미)", price: 45900, status: "배송완료" },
];

export default function MyPage() {
  const { balance, history } = usePoints();

  return (
    <div className="px-4 py-6">
      <h1 className="text-xl font-bold mb-5">마이페이지</h1>

      <section className="border border-gray-100 rounded-xl p-5 mb-4 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-brand-light flex items-center justify-center text-2xl">🙂</div>
        <div>
          <p className="font-bold">고객님, 반갑습니다</p>
          <p className="text-xs text-gray-400">demo@farm-mall.example</p>
        </div>
      </section>

      <Link
        href="/quiz"
        className="card-tap block rounded-2xl bg-gradient-to-br from-brand to-brand-dark text-white p-5 mb-6 relative overflow-hidden"
      >
        <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/10 blur-xl animate-blob" />
        <p className="text-xs opacity-80 mb-1">보유 적립금</p>
        <p className="text-2xl font-extrabold mb-2">{balance.toLocaleString()}원</p>
        <span className="text-xs bg-white/20 rounded-full px-3 py-1">퀴즈 풀고 더 모으기 →</span>
      </Link>

      <section className="grid grid-cols-4 text-center gap-2 mb-8">
        {[
          ["입금대기", 0],
          ["배송준비", 0],
          ["배송중", 1],
          ["배송완료", 1],
        ].map(([label, count]) => (
          <div key={label as string} className="border border-gray-100 rounded-xl py-4">
            <p className="text-lg font-bold text-brand-dark">{count}</p>
            <p className="text-xs text-gray-500">{label}</p>
          </div>
        ))}
      </section>

      <section className="mb-8">
        <h2 className="font-bold mb-3">최근 주문내역</h2>
        <div className="space-y-3">
          {mockOrders.map((o) => (
            <div key={o.id} className="border border-gray-100 rounded-xl p-4 flex justify-between items-center">
              <div>
                <p className="text-xs text-gray-400">{o.date} · {o.id}</p>
                <p className="text-sm font-medium">{o.name}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-brand-dark font-semibold">{o.status}</p>
                <p className="text-sm font-bold">{o.price.toLocaleString()}원</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-bold mb-3">적립금 내역</h2>
        {history.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center border border-dashed border-gray-200 rounded-xl">
            아직 적립금 내역이 없어요. 오늘의 퀴즈를 풀어보세요!
          </p>
        ) : (
          <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
            {history.map((h) => (
              <div key={h.id} className="flex justify-between items-center px-4 py-3">
                <div>
                  <p className="text-sm text-gray-700">{h.label}</p>
                  <p className="text-[11px] text-gray-400">
                    {new Date(h.date).toLocaleString("ko-KR")}
                  </p>
                </div>
                <p className={`text-sm font-bold ${h.amount > 0 ? "text-brand-dark" : "text-gray-500"}`}>
                  {h.amount > 0 ? "+" : ""}
                  {h.amount.toLocaleString()}원
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <p className="text-[11px] text-gray-400 mt-8">
        ※ 데모 화면입니다. 주문내역은 예시 데이터이며, 적립금은 이 브라우저에 저장되는 데모용
        데이터입니다.
      </p>
    </div>
  );
}
