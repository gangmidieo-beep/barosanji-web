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

/**
 * 실제 서비스 오픈 전 상태 — 아직 진짜 주문/방문자 데이터가 없으므로 전부 0/빈 값으로 시작한다.
 * (예전에는 데모용으로 그럴듯한 가짜 매출/방문자 숫자를 시드 기반으로 채워뒀었지만,
 * 실사용을 앞두고 오해를 주지 않도록 초기화함. 실제 서비스로 전환할 때는 이 함수를
 * 진짜 주문/회원/방문자 DB 쿼리로 통째로 교체해야 한다.)
 */
export function buildDashboardData(): DashboardData {
  const today = new Date();

  // 최근 14일 — 날짜 라벨만 채우고 매출은 전부 0
  const days: SeriesPoint[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push({ key: `${d.getMonth() + 1}/${d.getDate()}`, value: 0 });
  }

  const miniSeries: SeriesPoint[] = days.map((d) => ({ key: d.key, value: 0 }));

  const sourceNames = ["밴드", "네이버", "카카오톡", "인스타그램", "구글", "직접 방문"];
  const sourceRows = sourceNames.map((name) => ({ name, c: 0 }));

  const orders: MockOrder[] = [];
  const users: MockUser[] = [];

  return {
    title: "대시보드",
    hero: {
      label: `${today.getMonth() + 1}월 매출`,
      labelSub: "(결제된 주문 기준)",
      value: 0,
      unit: "원",
      sub: "주문 0건",
      delta: null,
      right: {
        label: "전체 누적 매출",
        value: 0,
        unit: "원",
        sub: "총 주문 0건",
      },
    },
    tiles: [
      { label: "오늘 매출", value: 0, unit: "원", note: "0건" },
      { label: "최근 7일 매출", value: 0, unit: "원", note: "0건" },
      { label: "오늘 방문자", value: 0, unit: "명" },
      { label: "최근 7일 방문자", value: 0, unit: "명", note: "데이터 없음" },
    ],
    todo: [
      { label: "결제 대기 주문", n: 0, href: "/admin/orders" },
      { label: "발송할 주문", n: 0, href: "/admin/orders" },
      { label: "전체 회원", n: 0, href: "/admin/users" },
      { label: "전체 상품", n: products.length, href: "/admin/products" },
    ],
    chart: {
      title: "최근 14일 매출",
      caption: "결제된 주문의 하루 합계입니다. 실제 주문이 쌓이면 여기에 표시됩니다.",
      series: days,
      unit: "원",
      footerTotal: 0,
      footerAvg: 0,
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
