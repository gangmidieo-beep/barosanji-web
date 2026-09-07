"use client";

import { useCallback, useEffect, useState } from "react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Card, Empty, PeriodPicker, periodQuery, won, pct, todayStr, type PeriodKey } from "@/components/admin/channels/ui";

type Summary = {
  channelId: string;
  channelName: string;
  orderCount: number;
  cancelledCount: number;
  itemCount: number;
  revenue: number;
  fee: number;
  cost: number;
  adCost: number;
  claimLoss: number;
  profit: number;
  margin: number;
  missingCostOrders: number;
  settlementPending: number;
};
type ProductRow = { productId: string; name: string; quantity: number; revenue: number; fee: number; cost: number; adCost: number; profit: number; margin: number; missingCost: boolean };
type Daily = { day: string; revenue: number; profit: number; orders: number };
type Report = {
  channels: Summary[];
  total: Summary;
  products: ProductRow[];
  daily: Daily[];
  settlementCalendar: { day: string; channelId: string; channelName: string; amount: number }[];
  unallocatedAds: Record<string, number>;
};

const profitCls = (n: number) => (n < 0 ? "text-red-500" : "text-brand-dark");

export default function ChannelDashboardPage() {
  const [period, setPeriod] = useState<{ period: PeriodKey; from: string; to: string }>({ period: "month", from: todayStr().slice(0, 8) + "01", to: todayStr() });
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/channels/summary?${periodQuery(period)}`, { cache: "no-store" });
      const data = await res.json();
      if (!data.success) throw new Error(data.errorMessage || "불러오기 실패");
      setReport(data.report);
    } catch (e) {
      setError(e instanceof Error ? e.message : "불러오기 실패");
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    load();
  }, [load]);

  const t = report?.total;
  const active = (report?.channels ?? []).filter((c) => c.orderCount > 0 || c.cancelledCount > 0 || c.adCost > 0);
  const maxRevenue = Math.max(1, ...active.map((c) => c.revenue));
  const maxDaily = Math.max(1, ...(report?.daily ?? []).map((d) => d.revenue));
  const missingTotal = t?.missingCostOrders ?? 0;
  const unallocated = Object.entries(report?.unallocatedAds ?? {}).filter(([, v]) => v > 0);

  return (
    <div>
      <AdminPageHeader
        title="통합관리 — 수익 대시보드"
        description="자사몰 + 오픈마켓 전 채널의 주문·매출·수수료·원가·광고비를 한 곳에서. 순수익 = 매출 − 수수료 − 원가 − 광고비 − 클레임 손실"
      />
      <div className="mb-5">
        <PeriodPicker value={period} onChange={setPeriod} />
      </div>

      {error && <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm">{error}</div>}
      {loading && !report && <Empty text="불러오는 중..." />}

      {t && (
        <>
          {missingTotal > 0 && (
            <div className="mb-4 p-3 rounded-lg bg-amber-50 text-amber-800 text-sm">
              ⚠️ 원가가 입력되지 않은 상품이 포함된 주문이 {missingTotal}건 있습니다. 순수익이 실제보다 높게 표시됩니다.{" "}
              <a href="/admin/channels/costs" className="underline font-semibold">상품 원가 입력하기</a>
            </div>
          )}
          {unallocated.length > 0 && (
            <div className="mb-4 p-3 rounded-lg bg-gray-50 text-gray-600 text-xs">
              주문이 없는 날의 광고비(주문에 배분되지 않은 광고비)도 채널 합계에는 포함했습니다:{" "}
              {unallocated.map(([k, v]) => `${report?.channels.find((c) => c.channelId === k)?.channelName ?? k} ${won(v)}`).join(", ")}
            </div>
          )}

          {/* 합계 카드 */}
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3 mb-6">
            {[
              { label: "주문", value: `${t.orderCount.toLocaleString()}건`, sub: t.cancelledCount ? `취소·반품 ${t.cancelledCount}건` : undefined },
              { label: "매출", value: won(t.revenue) },
              { label: "채널 수수료", value: `−${won(t.fee)}`, sub: t.revenue ? pct(t.fee / t.revenue) : undefined },
              { label: "원가", value: `−${won(t.cost)}`, sub: t.revenue ? pct(t.cost / t.revenue) : undefined },
              { label: "광고비", value: `−${won(t.adCost)}`, sub: t.revenue ? pct(t.adCost / t.revenue) : undefined },
              { label: "클레임 손실", value: `−${won(t.claimLoss)}` },
              { label: "순수익", value: won(t.profit), sub: `순수익률 ${pct(t.margin)}`, hi: true },
            ].map((c) => (
              <div key={c.label} className={`rounded-xl p-4 border ${c.hi ? "bg-brand-light border-brand/30" : "bg-white border-gray-100"}`}>
                <div className="text-xs text-gray-500">{c.label}</div>
                <div className={`text-lg font-bold mt-1 ${c.hi ? profitCls(t.profit) : "text-gray-900"}`}>{c.value}</div>
                {c.sub && <div className="text-[11px] text-gray-400 mt-0.5">{c.sub}</div>}
              </div>
            ))}
          </div>

          {/* 채널별 표 */}
          <Card title="채널별 실적" className="mb-6">
            {active.length === 0 ? (
              <Empty text="이 기간에 주문이 없습니다. 채널 주문 탭에서 주문을 등록하거나 엑셀로 올려주세요." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-400 text-xs border-b border-gray-100">
                      <th className="px-3 py-2 font-medium">채널</th>
                      <th className="px-3 py-2 font-medium text-right">주문</th>
                      <th className="px-3 py-2 font-medium text-right">매출</th>
                      <th className="px-3 py-2 font-medium w-40">비중</th>
                      <th className="px-3 py-2 font-medium text-right">수수료</th>
                      <th className="px-3 py-2 font-medium text-right">원가</th>
                      <th className="px-3 py-2 font-medium text-right">광고비</th>
                      <th className="px-3 py-2 font-medium text-right">클레임</th>
                      <th className="px-3 py-2 font-medium text-right">순수익</th>
                      <th className="px-3 py-2 font-medium text-right">순수익률</th>
                      <th className="px-3 py-2 font-medium text-right">정산 대기</th>
                    </tr>
                  </thead>
                  <tbody>
                    {active.map((c) => (
                      <tr key={c.channelId} className="border-b border-gray-50 last:border-0">
                        <td className="px-3 py-2.5 font-medium">
                          {c.channelName}
                          {c.missingCostOrders > 0 && <span className="ml-1 text-[10px] text-amber-600">원가미입력 {c.missingCostOrders}</span>}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          {c.orderCount}건{c.cancelledCount > 0 && <span className="text-[10px] text-gray-400 ml-1">(취소 {c.cancelledCount})</span>}
                        </td>
                        <td className="px-3 py-2.5 text-right font-semibold">{won(c.revenue)}</td>
                        <td className="px-3 py-2.5">
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-brand rounded-full" style={{ width: `${(c.revenue / maxRevenue) * 100}%` }} />
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-right text-gray-600">{won(c.fee)}</td>
                        <td className="px-3 py-2.5 text-right text-gray-600">{won(c.cost)}</td>
                        <td className="px-3 py-2.5 text-right text-gray-600">{won(c.adCost)}</td>
                        <td className="px-3 py-2.5 text-right text-gray-600">{won(c.claimLoss)}</td>
                        <td className={`px-3 py-2.5 text-right font-bold ${profitCls(c.profit)}`}>{won(c.profit)}</td>
                        <td className={`px-3 py-2.5 text-right ${profitCls(c.profit)}`}>{pct(c.margin)}</td>
                        <td className="px-3 py-2.5 text-right text-gray-500">{won(c.settlementPending)}</td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50 font-semibold">
                      <td className="px-3 py-2.5">합계</td>
                      <td className="px-3 py-2.5 text-right">{t.orderCount}건</td>
                      <td className="px-3 py-2.5 text-right">{won(t.revenue)}</td>
                      <td />
                      <td className="px-3 py-2.5 text-right">{won(t.fee)}</td>
                      <td className="px-3 py-2.5 text-right">{won(t.cost)}</td>
                      <td className="px-3 py-2.5 text-right">{won(t.adCost)}</td>
                      <td className="px-3 py-2.5 text-right">{won(t.claimLoss)}</td>
                      <td className={`px-3 py-2.5 text-right ${profitCls(t.profit)}`}>{won(t.profit)}</td>
                      <td className={`px-3 py-2.5 text-right ${profitCls(t.profit)}`}>{pct(t.margin)}</td>
                      <td className="px-3 py-2.5 text-right">{won(t.settlementPending)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            {/* 일별 추이 */}
            <Card title="일별 매출 · 순수익">
              {report!.daily.length === 0 ? (
                <Empty text="데이터 없음" />
              ) : (
                <div className="space-y-1.5">
                  {report!.daily.map((d) => (
                    <div key={d.day} className="flex items-center gap-2 text-xs">
                      <span className="w-20 text-gray-400">{d.day.slice(5)}</span>
                      <div className="flex-1 h-4 bg-gray-100 rounded overflow-hidden relative">
                        <div className="absolute inset-y-0 left-0 bg-brand/25" style={{ width: `${(d.revenue / maxDaily) * 100}%` }} />
                        <div className={`absolute inset-y-0 left-0 ${d.profit < 0 ? "bg-red-400" : "bg-brand"}`} style={{ width: `${(Math.max(0, d.profit) / maxDaily) * 100}%` }} />
                      </div>
                      <span className="w-24 text-right text-gray-600">{won(d.revenue)}</span>
                      <span className={`w-24 text-right font-semibold ${profitCls(d.profit)}`}>{won(d.profit)}</span>
                      <span className="w-10 text-right text-gray-400">{d.orders}건</span>
                    </div>
                  ))}
                  <div className="text-[10px] text-gray-400 pt-1">연한 막대 = 매출, 진한 막대 = 순수익</div>
                </div>
              )}
            </Card>

            {/* 정산 캘린더 */}
            <Card title="정산 입금 예정 (채널 정산일수 기준)">
              {report!.settlementCalendar.length === 0 ? (
                <Empty text="입금 예정 내역 없음" />
              ) : (
                <div className="max-h-80 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-gray-400 border-b border-gray-100">
                        <th className="px-2 py-1.5 font-medium">예정일</th>
                        <th className="px-2 py-1.5 font-medium">채널</th>
                        <th className="px-2 py-1.5 font-medium text-right">금액</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report!.settlementCalendar.map((s) => (
                        <tr key={`${s.day}-${s.channelId}`} className="border-b border-gray-50 last:border-0">
                          <td className="px-2 py-1.5">{s.day}</td>
                          <td className="px-2 py-1.5">{s.channelName}</td>
                          <td className="px-2 py-1.5 text-right font-semibold">{won(s.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="text-[10px] text-gray-400 mt-2">실제 입금일은 구매확정 시점·영업일에 따라 달라집니다. 정산일수는 수수료·채널 설정 탭에서 조정.</p>
            </Card>
          </div>

          {/* 상품별 순수익 */}
          <Card title="상품별 순수익 (많이 남는 순)">
            {report!.products.length === 0 ? (
              <Empty text="데이터 없음" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-400 text-xs border-b border-gray-100">
                      <th className="px-3 py-2 font-medium">상품</th>
                      <th className="px-3 py-2 font-medium text-right">판매수량</th>
                      <th className="px-3 py-2 font-medium text-right">매출</th>
                      <th className="px-3 py-2 font-medium text-right">수수료</th>
                      <th className="px-3 py-2 font-medium text-right">원가</th>
                      <th className="px-3 py-2 font-medium text-right">광고비</th>
                      <th className="px-3 py-2 font-medium text-right">순수익</th>
                      <th className="px-3 py-2 font-medium text-right">순수익률</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report!.products.map((p) => (
                      <tr key={p.productId} className="border-b border-gray-50 last:border-0">
                        <td className="px-3 py-2">
                          {p.name}
                          {p.missingCost && <span className="ml-1 text-[10px] text-amber-600">원가미입력</span>}
                        </td>
                        <td className="px-3 py-2 text-right">{p.quantity}</td>
                        <td className="px-3 py-2 text-right">{won(p.revenue)}</td>
                        <td className="px-3 py-2 text-right text-gray-500">{won(p.fee)}</td>
                        <td className="px-3 py-2 text-right text-gray-500">{won(p.cost)}</td>
                        <td className="px-3 py-2 text-right text-gray-500">{won(p.adCost)}</td>
                        <td className={`px-3 py-2 text-right font-bold ${profitCls(p.profit)}`}>{won(p.profit)}</td>
                        <td className={`px-3 py-2 text-right ${profitCls(p.profit)}`}>{pct(p.margin)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
          <p className="text-[11px] text-gray-400 mt-3">취소·반품 주문은 매출에서 제외되고 클레임 손실만 반영됩니다. 자사몰(바로산지) 주문은 주문 관리의 주문을 그대로 집계합니다.</p>
        </>
      )}
    </div>
  );
}
