import { NextRequest, NextResponse } from "next/server";
import {
  getPayMapConfig,
  isPayMapConfigured,
  getPayMapEasyConfig,
  isPayMapEasyConfigured,
  PAYMAP_AUTH_URL,
} from "@/lib/paymap";
import { createPendingOrder, type NewOrderItem } from "@/lib/db-orders";
import { parseRefCookie, REF_COOKIE } from "@/lib/affiliate";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || !body.goodname || !body.price || !body.recvphone || !body.orderId) {
    return NextResponse.json(
      { success: false, errorMessage: "필수 값이 누락되었습니다." },
      { status: 400 }
    );
  }

  // 결제유형: auth=인증결제(신용카드) / easy=간편결제(카카오·네이버)
  const payType = body.payType === "easy" ? "easy" : "auth";
  const configured =
    payType === "easy" ? isPayMapEasyConfigured() : isPayMapConfigured();
  if (!configured) {
    return NextResponse.json(
      {
        success: false,
        errorMessage: `페이맵 ${
          payType === "easy" ? "간편결제" : "인증결제"
        } 연동 정보가 설정되어 있지 않습니다. Railway 환경변수를 확인해주세요.`,
      },
      { status: 500 }
    );
  }

  const orderId = String(body.orderId);
  // 추천 링크 쿠키(있으면) → 이 주문의 추천인 = 마지막 클릭 파트너 1명 (last-click)
  const ref = parseRefCookie(req.cookies.get(REF_COOKIE)?.value);

  // 결제통지에서 발주를 올릴 때 필요하므로 배송지/상품을 "결제대기"로 먼저 저장
  if (body.receiverName && body.receiverAddress && Array.isArray(body.items)) {
    const items: NewOrderItem[] = body.items
      .filter((it: unknown) => it && typeof it === "object")
      .map((it: { productId?: unknown; name?: unknown; unit?: unknown; quantity?: unknown; price?: unknown; supplierId?: unknown }) => ({
        productId: it.productId ? String(it.productId) : undefined,
        name: String(it.name ?? ""),
        unit: it.unit ? String(it.unit) : "",
        quantity: Number(it.quantity ?? 1),
        price: Number(it.price ?? 0),
        supplierId: String(it.supplierId ?? ""),
      }));

    await createPendingOrder({
      id: orderId,
      receiverName: String(body.receiverName),
      receiverPhone: String(body.recvphone),
      receiverAddress: String(body.receiverAddress),
      receiverAddressDetail: body.receiverAddressDetail ? String(body.receiverAddressDetail) : undefined,
      deliveryMemo: body.deliveryMemo ? String(body.deliveryMemo) : undefined,
      items,
      amount: Number(body.price),
      referrerPartnerId: ref?.partnerId ?? null,
      referrerLinkId: ref?.linkId ?? null,
    });
  }

  const cfg = payType === "easy" ? getPayMapEasyConfig() : getPayMapConfig();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  // 페이맵은 리다이렉트가 아니라 form POST 방식이라, 브라우저에서 폼으로 전송할 값들을 내려준다.
  return NextResponse.json({
    success: true,
    action: PAYMAP_AUTH_URL,
    fields: {
      pay_key: cfg.payKey,
      mid: cfg.mid,
      tid: cfg.tid,
      ord_num: orderId,
      item_name: String(body.goodname).slice(0, 100),
      amount: String(Number(body.price)),
      buyer_name: String(body.receiverName ?? "").slice(0, 50),
      buyer_phone: String(body.recvphone).replace(/[^0-9]/g, ""),
      installment: "00",
      return_url: `${siteUrl}/order-complete`,
      user_agent: "WM",
    },
  });
}
