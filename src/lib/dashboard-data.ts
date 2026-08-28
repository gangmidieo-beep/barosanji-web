import { products } from "./data";
import { getSupplierById } from "./suppliers";

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

export type OrderStatus = "결제완료" | "배송준비" | "배송중" | "배송완료" | "결제대기";

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

export function buildDashboardData(): DashboardData {
  const rand = seededRandom(20260828);
  const today = new Date();

  // 최근 14일 매출 시리즈 (주말에 더 팔리는 패턴 + 완만한 우상향)
  const days: SeriesPoint[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    const base = 90000 + (13 - i) * 6000;
    const weekendBoost = isWeekend ? 1.6 : 1;
    const noise = 0.6 + rand() * 0.9;
    const value = Math.round((base * weekendBoost * noise) / 1000) * 1000;
    days.push({ key: `${d.getMonth() + 1}/${d.getDate()}`, value });
  }
  const total = days.reduce((s, d) => s + d.value, 0);

  const todaySales = days[days.length - 1].value;
  const yesterdaySales = days[days.length - 2].value;
  const week = days.slice(-7).reduce((s, d) => s + d.value, 0);
  const prevWeek = days.slice(0, 7).reduce((s, d) => s + d.value, 0);
  const monthSales = total + Math.round(total * 1.02); // 데모용 월 누적 근사치
  const allTimeSales = monthSales + Math.round(monthSales * 0.45);

  const visitsToday = 90 + Math.floor(rand() * 60);
  const visitsYesterday = 90 + Math.floor(rand() * 60);
  const visitsWeek = 700 + Math.floor(rand() * 200);

  const miniSeries: SeriesPoint[] = days.map((d, i) => ({
    key: d.key,
    value: 30 + Math.floor(rand() * 70) + (i % 7 === 5 || i % 7 === 6 ? 20 : 0),
  }));

  const sourceNames = ["밴드", "네이버", "카카오톡", "인스타그램", "구글", "직접 방문"];
  const sourceRows = sourceNames
    .map((name) => ({ name, c: 110 + Math.floor(rand() * 60) }))
    .sort((a, b) => b.c - a.c);

  const orders = buildMockOrders(8);
  const users = buildMockUsers(5);

  return {
    title: "대시보드",
    hero: {
      label: `${today.getMonth() + 1}월 매출`,
      labelSub: "(결제된 주문 기준)",
      value: monthSales,
      unit: "원",
      sub: `주문 ${120 + Math.floor(rand() * 30)}건`,
      delta: dashDelta(monthSales, Math.round(monthSales / 2.2)),
      right: {
        label: "전체 누적 매출",
        value: allTimeSales,
        unit: "원",
        sub: `총 주문 ${180 + Math.floor(rand() * 30)}건`,
      },
    },
    tiles: [
      {
        label: "오늘 매출",
        value: todaySales,
        unit: "원",
        delta: dashDelta(todaySales, yesterdaySales),
        deltaLabel: "어제 대비",
        note: `${3 + Math.floor(rand() * 6)}건`,
      },
      {
        label: "최근 7일 매출",
        value: week,
        unit: "원",
        delta: dashDelta(week, prevWeek),
        deltaLabel: "직전 7일 대비",
        note: `${25 + Math.floor(rand() * 10)}건`,
      },
      {
        label: "오늘 방문자",
        value: visitsToday,
        unit: "명",
        delta: dashDelta(visitsToday, visitsYesterday),
        deltaLabel: "어제 대비",
      },
      {
        label: "최근 7일 방문자",
        value: visitsWeek,
        unit: "명",
        note: `100명 중 ${(3 + rand() * 2).toFixed(1)}명이 주문`,
      },
    ],
    todo: [
      { label: "결제 대기 주문", n: 20 + Math.floor(rand() * 30), warn: true, href: "/admin/orders" },
      { label: "발송할 주문", n: 90 + Math.floor(rand() * 60), warn: true, href: "/admin/orders" },
      { label: "전체 회원", n: 18 + Math.floor(rand() * 20), href: "/admin/users" },
      { label: "전체 상품", n: products.length * 3 + Math.floor(rand() * 10), href: "/admin/products" },
    ],
    chart: {
      title: "최근 14일 매출",
      caption: "결제된 주문의 하루 합계입니다. 막대에 마우스를 올리면 날짜와 금액이 보입니다.",
      series: days,
      unit: "원",
      footerTotal: total,
      footerAvg: Math.round(total / 14),
    },
    sources: {
      title: "어디서 들어왔나",
      titleSub: "최근 7일",
      caption: "손님이 어떤 경로로 찾아왔는지 보여줍니다.",
      rows: sourceRows,
      unit: "명",
    },
    miniChart: {
      title: "최근 14일 방문자",
      series: miniSeries,
      left: `${fmtMonthDay(new Date(new Date().setDate(today.getDate() - 13)))}`,
      right: "오늘",
    },
    orders,
    users,
  };
}
