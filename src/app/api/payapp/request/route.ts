import { NextRequest, NextResponse } from "next/server";
import { isPayAppConfigured, requestPayApp } from "@/lib/payapp";

export async function POST(req: NextRequest) {
  if (!isPayAppConfigured()) {
    return NextResponse.json(
      {
        success: false,
        errorMessage:
          "페이앱 연동 정보(PAYAPP_USERID / PAYAPP_LINKKEY / PAYAPP_LINKVAL)가 설정되어 있지 않습니다. .env.local을 확인해주세요.",
      },
      { status: 500 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body || !body.goodname || !body.price || !body.recvphone || !body.orderId) {
    return NextResponse.json(
      { success: false, errorMessage: "필수 값이 누락되었습니다 (goodname, price, recvphone, orderId)." },
      { status: 400 }
    );
  }

  const result = await requestPayApp({
    goodname: String(body.goodname),
    price: Number(body.price),
    recvphone: String(body.recvphone),
    orderId: String(body.orderId),
  });

  return NextResponse.json(result);
}
