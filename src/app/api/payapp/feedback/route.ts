import { NextRequest } from "next/server";
import { verifyPayAppFeedback, isPaidState } from "@/lib/payapp";

/**
 * 페이앱이 결제 상태가 바뀔 때마다 서버 대 서버로 호출하는 웹훅.
 * 반드시 응답 본문에 "SUCCESS" 텍스트를 200으로 반환해야 페이앱이 재시도하지 않는다.
 */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const data: Record<string, string> = {};
  form.forEach((value, key) => {
    data[key] = String(value);
  });

  if (!verifyPayAppFeedback(data)) {
    // userid/linkkey/linkval이 일치하지 않으면 위조된 요청일 수 있으므로 무시
    return new Response("SUCCESS", { status: 200 });
  }

  const orderId = data.var1;
  const paid = isPaidState(data.pay_state);

  // TODO: 실제 서비스에서는 여기서 DB의 주문 상태를 업데이트하고,
  // 결제 완료(pay_state=4)일 때만 적립금 지급/재고 차감 등을 처리해야 합니다.
  console.log("[payapp feedback]", { orderId, payState: data.pay_state, paid, mulNo: data.mul_no });

  return new Response("SUCCESS", { status: 200 });
}
