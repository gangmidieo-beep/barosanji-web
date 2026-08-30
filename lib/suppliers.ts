/**
 * 도매 공급업체(산지) 등록 정보.
 *
 * 업체마다 어드민플러스(AdminPlus) 계정과 client_id/client_secret이 다르므로,
 * 상품마다 "이 상품은 어느 업체 발주인지"를 태그해두고, 주문이 들어오면
 * 그 업체의 키로 어드민플러스에 발주를 올려야 함.
 *
 * `name`은 관리자(나)만 보는 내부 구분용 이름입니다 — 고객에게 노출되는
 * 상품 상세의 "산지/농가명"(Product.farm)과는 별개입니다. 예를 들어 고객에게는
 * "청송 은하수 농원"으로 보이지만, 실제 발주는 그 농원과 계약한 도매업체
 * "OO청과"의 어드민플러스 계정으로 나갈 수 있습니다.
 *
 * 업체 키(client_id/secret)는 절대 이 파일에 하드코딩하지 말 것 — 업체별로
 * 환경변수 이름만 여기 등록해두고, 실제 값은 .env.local에 넣습니다:
 *   ADMINPLUS_CLIENT_ID_<envKey>
 *   ADMINPLUS_CLIENT_SECRET_<envKey>
 *
 * 업체를 추가/변경할 때는 이 배열에 한 줄 추가하고, 해당 상품들의 supplierId를
 * 맞춰주면 됩니다. (나중에 관리자 화면에서 직접 관리하도록 바꿀 수도 있음 — 지금은
 * 코드로 관리하는 최소 버전)
 */

export type Supplier = {
  id: string; // Product.supplierId 와 매칭되는 내부 ID
  name: string; // 관리자만 보는 업체 이름 (고객 비노출)
  envKey: string; // 환경변수 접미사 (예: "A" -> ADMINPLUS_CLIENT_ID_A)
};

export const suppliers: Supplier[] = [
  { id: "supplier-1", name: "팡이네", envKey: "PANGINE" },
  { id: "supplier-2", name: "신흥유통", envKey: "SINHEUNG" },
  { id: "supplier-3", name: "늘푸른", envKey: "NEULPUREUN" },
  { id: "supplier-4", name: "마니팜", envKey: "MANIPARM" },
];

export function getSupplierById(id: string): Supplier | undefined {
  return suppliers.find((s) => s.id === id);
}

export function isSupplierConfigured(envKey: string): boolean {
  return Boolean(
    process.env[`ADMINPLUS_CLIENT_ID_${envKey}`] && process.env[`ADMINPLUS_CLIENT_SECRET_${envKey}`]
  );
}

export function getSupplierCredentials(
  envKey: string
): { clientId: string; clientSecret: string } | null {
  const clientId = process.env[`ADMINPLUS_CLIENT_ID_${envKey}`];
  const clientSecret = process.env[`ADMINPLUS_CLIENT_SECRET_${envKey}`];
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}
