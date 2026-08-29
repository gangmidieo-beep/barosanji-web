import { DEFAULT_MAX_QTY_PER_PRODUCT } from "./site-config";

export type Category = {
  slug: string;
  name: string;
  icon: string;
};

export const categories: Category[] = [
  { slug: "time-sale", name: "타임특가", icon: "⏰" },
  { slug: "group-buy", name: "공동구매", icon: "🤝" },
  { slug: "direct", name: "산지직송", icon: "🚚" },
  { slug: "fruit", name: "과일", icon: "🍎" },
  { slug: "vegetable", name: "농산물", icon: "🥬" },
  { slug: "meat", name: "정육", icon: "🥩" },
  { slug: "fish", name: "수산", icon: "🐟" },
  { slug: "side-dish", name: "반찬·간편식", icon: "🍱" },
  { slug: "event", name: "선물세트", icon: "🎁" },
];

export type Product = {
  id: string;
  name: string;
  category: string; // category slug
  farm: string; // 산지/농가명 (고객에게 노출)
  region: string; // 산지 지역
  price: number;
  originalPrice: number;
  unit: string;
  badge?: "타임특가" | "한정수량" | "산지직송" | "신상품";
  rating: number;
  reviewCount: number;
  image: string; // emoji placeholder(기본값) — images가 있으면 화면에서는 images[0]이 우선 사용됨
  /**
   * 상품 썸네일 갤러리 (최대 10장). 상품 목록 카드/상세페이지 상단 이미지에 쓰인다.
   * 업로드 파일의 data URL(png/jpg/gif 등)이 들어간다.
   */
  images?: string[];
  /**
   * 상세페이지 하단 "상세정보"에 순서대로 노출되는 상세 이미지 목록.
   * 업로드 파일의 data URL(png/jpg/gif 등)이 들어간다. gif도 애니메이션 그대로 재생됨.
   */
  detailImages?: string[];
  description: string;
  /**
   * 관리자 전용 필드 — 고객 화면에는 절대 표시하지 않음.
   * 어느 도매 공급업체(어드민플러스 계정)로 발주를 보낼지 구분하는 내부 ID.
   * src/lib/suppliers.ts 의 Supplier.id 와 매칭됨.
   */
  supplierId: string;
  /**
   * 1인당(1회 주문당) 최대 구매 수량. 비워두면 DEFAULT_MAX_QTY_PER_PRODUCT가 적용됨.
   * 한 품목을 대량으로 담기보다 여러 품목을 나눠 담도록 유도하기 위한 제한.
   */
  maxQty?: number;
  /**
   * 옵션(용량/무게 등) 목록 — 예: 1kg, 2kg, 3kg, 5kg마다 다른 가격.
   * 있으면 상세페이지에서 옵션을 고르게 하고, 선택한 옵션의 price를 사용함.
   * 없으면 기존처럼 price/unit 하나만 사용.
   */
  options?: { label: string; price: number }[];
};

const img = (emoji: string) => emoji;

export const products: Product[] = [
  {
    id: "p1",
    name: "경북 청송 꿀사과 (5kg/특)",
    category: "fruit",
    farm: "청송 은하수 농원",
    region: "경북 청송",
    price: 23900,
    originalPrice: 32000,
    unit: "5kg 박스",
    badge: "타임특가",
    rating: 4.8,
    reviewCount: 1284,
    image: img("🍎"),
    description:
      "일교차 큰 청송에서 자란 당도 높은 꿀사과입니다. 수확 후 산지에서 바로 발송해 신선함을 유지합니다.",
    supplierId: "supplier-1",
  },
  {
    id: "p2",
    name: "제주 감귤 (가정용 10kg)",
    category: "fruit",
    farm: "제주 서귀포 감귤작목반",
    region: "제주 서귀포",
    price: 18900,
    originalPrice: 25000,
    unit: "10kg 박스",
    badge: "산지직송",
    rating: 4.7,
    reviewCount: 2043,
    image: img("🍊"),
    description: "제주 서귀포 농가에서 직접 선별하여 당일 발송하는 가정용 감귤입니다.",
    supplierId: "supplier-1",
  },
  {
    id: "p3",
    name: "해남 절임배추 (20kg)",
    category: "vegetable",
    farm: "해남 배추작목회",
    region: "전남 해남",
    price: 32900,
    originalPrice: 42000,
    unit: "20kg",
    badge: "한정수량",
    rating: 4.9,
    reviewCount: 876,
    image: img("🥬"),
    description: "김장철 인기 상품. 해남 청정 지역에서 재배한 배추를 산지에서 바로 절여 보내드립니다.",
    supplierId: "supplier-1",
  },
  {
    id: "p4",
    name: "완도 활전복 (특大 10미)",
    category: "fish",
    farm: "완도 청해수산",
    region: "전남 완도",
    price: 45900,
    originalPrice: 59000,
    unit: "10미",
    badge: "산지직송",
    rating: 4.9,
    reviewCount: 542,
    image: img("🦐"),
    description: "완도 청정해역에서 양식한 활전복을 주문 즉시 산지에서 출하합니다.",
    supplierId: "supplier-2",
  },
  {
    id: "p5",
    name: "이천 오대쌀 (10kg)",
    category: "side-dish",
    farm: "이천 쌀농협",
    region: "경기 이천",
    price: 34900,
    originalPrice: 39000,
    unit: "10kg",
    badge: "신상품",
    rating: 4.8,
    reviewCount: 1523,
    image: img("🌾"),
    description: "밥맛 좋기로 유명한 이천 오대쌀을 도정 즉시 발송합니다.",
    supplierId: "supplier-3",
  },
  {
    id: "p6",
    name: "횡성 한우 국거리 (500g)",
    category: "meat",
    farm: "횡성 축협",
    region: "강원 횡성",
    price: 27900,
    originalPrice: 35000,
    unit: "500g",
    badge: "타임특가",
    rating: 4.7,
    reviewCount: 389,
    image: img("🥩"),
    description: "1++ 등급 횡성 한우를 산지 도축장에서 바로 소분 발송합니다.",
    supplierId: "supplier-2",
  },
  {
    id: "p7",
    name: "나주 배 (가정용 7.5kg)",
    category: "fruit",
    farm: "나주 배원예농협",
    region: "전남 나주",
    price: 21900,
    originalPrice: 29000,
    unit: "7.5kg",
    rating: 4.6,
    reviewCount: 704,
    image: img("🍐"),
    description: "당도 선별된 나주 배를 농가에서 직접 포장하여 발송합니다.",
    supplierId: "supplier-1",
  },
  {
    id: "p8",
    name: "국산 손질오징어 (1kg)",
    category: "fish",
    farm: "동해 명태수산",
    region: "강원 동해",
    price: 15900,
    originalPrice: 21000,
    unit: "1kg",
    badge: "한정수량",
    rating: 4.5,
    reviewCount: 312,
    image: img("🦑"),
    description: "동해에서 잡아 즉시 손질 후 급냉한 오징어입니다.",
    supplierId: "supplier-2",
  },
  {
    id: "p9",
    name: "친환경 애호박 (5개입)",
    category: "vegetable",
    farm: "논산 친환경작목반",
    region: "충남 논산",
    price: 6900,
    originalPrice: 9000,
    unit: "5개입",
    rating: 4.6,
    reviewCount: 221,
    image: img("🥒"),
    description: "농약을 최소화한 친환경 애호박을 수확 다음날 바로 발송합니다.",
    supplierId: "supplier-1",
  },
  {
    id: "p10",
    name: "직화 순살 고등어조림 밀키트",
    category: "side-dish",
    farm: "통영 반찬공방",
    region: "경남 통영",
    price: 12900,
    originalPrice: 16000,
    unit: "2인분",
    badge: "신상품",
    rating: 4.4,
    reviewCount: 158,
    image: img("🍲"),
    description: "손질된 고등어와 양념이 함께 준비되어 있어 간편하게 조리할 수 있습니다.",
    supplierId: "supplier-3",
  },
  {
    id: "p11",
    name: "성주 참외 (가정용 5kg)",
    category: "fruit",
    farm: "성주 참외공선회",
    region: "경북 성주",
    price: 16900,
    originalPrice: 22000,
    unit: "5kg",
    badge: "산지직송",
    rating: 4.7,
    reviewCount: 933,
    image: img("🍈"),
    description: "당도 선별을 거친 성주 참외를 산지 농가에서 직접 발송합니다.",
    supplierId: "supplier-1",
  },
  {
    id: "p12",
    name: "곡성 유기농 현미 (4kg)",
    category: "side-dish",
    farm: "곡성 유기농작목반",
    region: "전남 곡성",
    price: 19900,
    originalPrice: 24000,
    unit: "4kg",
    rating: 4.8,
    reviewCount: 411,
    image: img("🌾"),
    description: "유기농 인증을 받은 곡성 현미를 소량씩 도정하여 발송합니다.",
    supplierId: "supplier-3",
  },
];

export function getProductsByCategory(slug: string) {
  if (slug === "time-sale") return products.filter((p) => p.badge === "타임특가");
  if (slug === "direct") return products.filter((p) => p.badge === "산지직송");
  if (slug === "event") return products;
  return products.filter((p) => p.category === slug);
}

export function getProductById(id: string) {
  return products.find((p) => p.id === id);
}

/** image 필드 값이 업로드된 실제 이미지(data URL/http)인지, 이모지 placeholder인지 구분 */
export function isImageUrl(image: string) {
  return image.startsWith("data:") || image.startsWith("http");
}

/** 상품 카드/상세 상단에 쓸 대표 썸네일 목록. images가 있으면 그걸 우선 쓰고, 없으면 image 하나짜리 목록으로 취급 */
export function getThumbnails(product: Product): string[] {
  if (product.images && product.images.length > 0) return product.images;
  return [product.image];
}

/** 1인당 최대 구매 수량 (상품에 지정된 값이 없으면 기본값 사용) */
export function getMaxQty(product: Product): number {
  return product.maxQty && product.maxQty > 0 ? product.maxQty : DEFAULT_MAX_QTY_PER_PRODUCT;
}
