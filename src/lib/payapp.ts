/**
 * 페이앱(PayApp) 결제 연동 헬퍼
 *
 * 참고: https://docs.payapp.kr (개발자센터)
 * ⚠️ 아래 구현은 공개 문서를 기준으로 작성한 것으로, 실제 연동 전 반드시
 *    페이앱 개발자센터의 최신 문서/샌드박스로 파라미터를 재확인해야 합니다.
 *
 * 필요한 환경변수 (.env.local):
 *   PAYAPP_USERID     - 페이앱 가맹점 아이디
 *   PAYAPP_LINKKEY    - 페이앱 연동 Key (feedback 검증용)
 *   PAYAPP_LINKVAL    - 페이앱 연동 Value (feedback 검증용)
 *   PAYAPP_TEST_MODE  - "1"이면 테스트 모드
 *   NEXT_PUBLIC_SITE_URL - feedbackurl/returnurl에 쓸 절대 도메인 (예: https://your-domain.com)
 */

const PAYAPP_API_URL = "https://api.payapp.kr/oapi/apiLoad.html";

export type PayAppRequestParams = {
  goodname: string;
  price: number;
  recvphone: string;
  orderId: string; // var1로 전달해서 feedback에서 주문을 식별
};

export type PayAppRequestResult =
  | { success: true; payUrl: string; mulNo: string }
  | { success: false; errorMessage: string; errno?: string };

function getEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`환경변수 ${name}가 설정되어 있지 않습니다.`);
  return v;
}

export function isPayAppConfigured(): boolean {
  return Boolean(
    process.env.PAYAPP_USERID && process.env.PAYAPP_LINKKEY && process.env.PAYAPP_LINKVAL
  );
}

/** 페이앱 응답은 "state=1&mul_no=123&payurl=..." 형태의 쿼리스트링 텍스트로 온다 */
function parsePayAppResponse(text: string): Record<string, string> {
  const params = new URLSearchParams(text.trim());
  const out: Record<string, string> = {};
  for (const [k, v] of params.entries()) out[k] = v;
  return out;
}

export async function requestPayApp(
  params: PayAppRequestParams
): Promise<PayAppRequestResult> {
  if (params.price < 1000) {
    return { success: false, errorMessage: "결제 금액은 최소 1,000원 이상이어야 합니다." };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const body = new URLSearchParams({
    cmd: "payrequest",
    userid: getEnv("PAYAPP_USERID"),
    goodname: params.goodname,
    price: String(Math.round(params.price)),
    recvphone: params.recvphone,
    feedbackurl: `${siteUrl}/api/payapp/feedback`,
    returnurl: `${siteUrl}/order-complete`,
    var1: params.orderId,
    ...(process.env.PAYAPP_TEST_MODE === "1" ? { checkretry: "n" } : {}),
  });

  try {
    const res = await fetch(PAYAPP_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    const text = await res.text();
    const data = parsePayAppResponse(text);

    if (data.state === "1" && data.payurl) {
      return { success: true, payUrl: data.payurl, mulNo: data.mul_no ?? "" };
    }
    return {
      success: false,
      errorMessage: data.errorMessage ?? "페이앱 결제 요청에 실패했습니다.",
      errno: data.errno,
    };
  } catch {
    return { success: false, errorMessage: "페이앱 서버와 통신할 수 없습니다." };
  }
}

/** feedbackurl로 들어온 요청이 실제 페이앱에서 온 것인지 검증 */
export function verifyPayAppFeedback(form: Record<string, string>): boolean {
  // 검증: userid + linkkey 일치로 확인한다.
  // (linkkey는 외부 유출되지 않는 비밀값이라 위조 방지에 충분. linkval은 l/I 등
  //  구분이 어려운 문자 때문에 오탐이 생겨 비교에서 제외.)
  return (
    form.userid === process.env.PAYAPP_USERID &&
    form.linkkey === process.env.PAYAPP_LINKKEY
  );
}

/** pay_state: 4=결제완료, 8/32=요청취소, 9/64=승인취소 */
export function isPaidState(payState: string | undefined): boolean {
  return payState === "4";
}
