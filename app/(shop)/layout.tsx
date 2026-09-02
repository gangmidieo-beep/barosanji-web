import { products } from "./data";
import { getSupplierById } from "./suppliers";
import type { DashboardStats } from "./db-orders";
import type { VisitStats } from "./db-visits";

export type Delta = { txt: string; dir: "up" | "down" | "flat" };

export function dashDelta(now: number, before: number): Delta {
  if (before === 0) return { txt: now > 0 ? "비교 기록 없음" : "-", dir: "flat" };
  const p = Math.round(((now - before) / before) * 100);
  return { txt: `${p > 0 ? "+" : ""}${p}%`, dir: p > 0 ? "up" : p < 0 ? "down" : "flat" };
}

export type SeriesPoint = { key: string; value: number };

export type DashboardData = {
  title: string;
  hero: {
    label: string;
    labelSub?: string;
    value: number;
    unit?: string;
    sub?: string;
    delta?: Delta | null;
    right?: { label: string; value: number; unit?: string; sub?: string };
  };
  tiles: {
    label: string;
    value?: number;
    text?: string;
    unit?: string;
    delta?: Delta | null;
    deltaLabel?: string;
    note?: string;
  }[];
  todo: { label: string; n: number; warn?: boolean; href?: string }[];
  chart: {
    title: string;
    caption?: string;
    series: SeriesPoint[];
    unit?: string;
    footerTotal: number;
    footerAvg: number;
  };
  sources: { title: string; titleSub?: string; caption?: string; rows: { name: string; c: number }[]; unit?: string };
  miniChart: { title: string; series: SeriesPoint[]; left?: string; right?: string };
  orders: MockOrder[];
  users: { initial: string; name: string; email: string; dateLabel: string }[];
};

export type OrderStatus = "결제완료" | "배송준비" | "배송중" | "배송완료" | "결제대기" | "결제취소";

export type MockOrder = {
  orderNo: string;
  buyer: string;
  dateLabel: string;
  status: OrderStatus;
  amount: number;
  productName: string;
  supplierName: string;
};

// 시드 기반 의사난수 (매번 새로고침해도 같은 데모 값이 나오도록)
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function fmtMonthDay(d: Date) {
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

const ORDER_STATUSES: OrderStatus[] = ["결제완료", "배송준비", "배송중", "배송완료", "결제대기"];
const SURNAMES = ["김", "이", "박", "최", "정", "윤", "장", "오", "서", "한"];

/** 관리자 주문 목록 등에서 재사용할 수 있도록 별도로 뽑아둔 데모 주문 생성 함수 */
export function buildMockOrders(count: number, seed = 20260828): MockOrder[] {
  const rand = seededRandom(seed);
  const today = new Date();
  return Array.from({ length: count }).map((_, i) => {
    const product = products[Math.floor(rand() * products.length)];
    const supplier = getSupplierById(product.supplierId);
    const d = new Date(today);
    d.setHours(d.getHours() - i * 5 - Math.floor(rand() * 4));
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return {
      orderNo: `ORD-${today.getFullYear()}${mm}${dd}-${String(999 - i).padStart(3, "0")}`,
      buyer: `${SURNAMES[Math.floor(rand() * SURNAMES.length)]}**`,
      dateLabel: `${mm}-${dd} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`,
      status: ORDER_STATUSES[Math.floor(rand() * ORDER_STATUSES.length)],
      amount: product.price,
      productName: product.name,
      supplierName: supplier?.name ?? "미지정",
    };
  });
}

const GIVEN_NAMES = ["민준", "지호", "하윤", "유진", "수아", "예은", "시우", "도윤", "서연", "하은"];

export type MockUser = { initial: string; name: string; email: string; dateLabel: string };

/** 관리자 회원 목록 등에서 재사용할 수 있도록 별도로 뽑아둔 데모 회원 생성 함수 */
export function buildMockUsers(count: number, seed = 20260828): MockUser[] {
  const rand = seededRandom(seed);
  const today = new Date();
  return Array.from({ length: count }).map((_, i) => {
    const surname = SURNAMES[Math.floor(rand() * SURNAMES.length)];
    const given = GIVEN_NAMES[Math.floor(rand() * GIVEN_NAMES.length)];
    const name = surname + given;
    const d = new Date(today);
    d.setDate(d.getDate() - i * 2 - Math.floor(rand() * 2));
    return {
      initial: surname,
      name,
      email: `user${100 + Math.floor(rand() * 900)}@example.com`,
      dateLabel: `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
    };
  });
}

/**
 * 관리자 메인 대시보드 데이터. 매출/주문 숫자는 getDashboardStats()로 실제 DB에서
 * 집계한 값을 stats로 받아 채운다. 방문자/유입경로는 아직 수집원이 없어 0으로 둔다.
 */
export function buildDashboardData(
  productCount: number,
  stats?: DashboardStats,
  recentOrders: MockOrder[] = [],
  visits?: VisitStats
): DashboardData {
  const today = new Date();
  // "N월 매출" 라벨은 매출 집계와 동일하게 한국시간 기준 월로 표기
  const kstMonth = new Date(Date.now() + 9 * 60 * 60 * 1000).getUTCMonth() + 1;

  // stats가 아직 안 넘어온 과도기(파일 순차 커밋 중)에는 0으로 안전하게 처리
  const s: DashboardStats = stats ?? {
    monthSales: 0,
    monthOrders: 0,
    totalSales: 0,
    totalOrders: 0,
    todaySales: 0,
    todayOrders: 0,
    last7Sales: 0,
    last7Orders: 0,
    pendingCount: 0,
    toShipCount: 0,
    dailySeries: [],
  };

  // 최근 14일 매출은 s.dailySeries(실제 DB 집계)를 그대로 사용
  const days: SeriesPoint[] = s.dailySeries;
  const chartTotal = days.reduce((acc, d) => acc + d.value, 0);

  // 방문자 데이터는 아직 수집원이 없어 0으로 둔다 (추후 애널리틱스 연동 시 교체)
  const miniSeries: SeriesPoint[] = visits?.dailySeries ?? days.map((d) => ({ key: d.key, value: 0 }));
  const sourceRows =
    visits && visits.sources.length > 0
      ? visits.sources
      : ["밴드", "네이버", "카카오톡", "인스타그램", "구글", "직접"].map((name) => ({ name, c: 0 }));

  return {
    title: "대시보드",
    hero: {
      label: `${kstMonth}월 매출`,
      labelSub: "(결제된 주문 기준)",
      value: s.monthSales,
      unit: "원",
      sub: `주문 ${s.monthOrders}건`,
      delta: null,
      right: {
        label: "전체 누적 매출",
        value: s.totalSales,
        unit: "원",
        sub: `총 주문 ${s.totalOrders}건`,
      },
    },
    tiles: [
      { label: "오늘 매출", value: s.todaySales, unit: "원", note: `${s.todayOrders}건` },
      { label: "최근 7일 매출", value: s.last7Sales, unit: "원", note: `${s.last7Orders}건` },
      { label: "오늘 방문자", value: visits?.todayVisitors ?? 0, unit: "명", note: `조회 ${visits?.todayViews ?? 0}회` },
      { label: "최근 7일 방문자", value: visits?.last7Visitors ?? 0, unit: "명", note: `조회 ${visits?.last7Views ?? 0}회` },
    ],
    todo: [
      { label: "결제 대기 주문", n: s.pendingCount, warn: s.pendingCount > 0, href: "/admin/orders" },
      { label: "발송할 주문", n: s.toShipCount, warn: s.toShipCount > 0, href: "/admin/orders" },
      { label: "전체 회원", n: 0, href: "/admin/users" },
      { label: "전체 상품", n: productCount, href: "/admin/products" },
    ],
    chart: {
      title: "최근 14일 매출",
      caption: "결제된 주문의 하루 합계입니다.",
      series: days,
      unit: "원",
      footerTotal: chartTotal,
      footerAvg: Math.round(chartTotal / (days.length || 1)),
    },
    sources: {
      title: "어디서 들어왔나",
      titleSub: "최근 7일",
      caption: "손님이 어떤 경로로 찾아왔는지 (utm_source·유입 도메인 기준)",
      rows: sourceRows,
      unit: "명",
    },
    miniChart: {
      title: "최근 14일 방문자",
      series: miniSeries,
      left: `${fmtMonthDay(new Date(new Date().setDate(today.getDate() - 13)))}`,
      right: "오늘",
    },
    orders: recentOrders,
    users: [],
  };
}
