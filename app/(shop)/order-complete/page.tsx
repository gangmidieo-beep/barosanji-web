import Link from "next/link";

/**
 * 결제 후 돌아오는 페이지(페이맵 return_url).
 * 페이맵은 결과를 쿼리스트링으로 붙여서 보내주는데, 실패했을 때 원인을 알 수 있도록
 * result_cd / result_msg가 있으면 화면에 그대로 보여준다.
 *
 * 주의: 실제 주문 확정(DB 반영/발주)은 이 화면이 아니라 결제통지(/api/paymap/noti)에서 처리한다.
 * 고객이 결제 후 창을 그냥 닫으면 이 화면은 안 뜨기 때문.
 */
export default async function OrderCompletePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

  const resultCd = one(params.result_cd);
  const resultMsg = one(params.result_msg);
  const ordNum = one(params.ord_num);
  const amount = one(params.amount);
  const apprNum = one(params.appr_num);

  // result_cd가 아예 없으면(적립금 전액결제 등) 기존처럼 완료 화면을 보여준다.
  const failed = resultCd !== undefined && resultCd !== "0000";

  return (
    <div className="px-4 py-24 text-center">
      <p className="text-6xl mb-4">{failed ? "⚠️" : "✅"}</p>
      <h1 className="text-2xl font-bold mb-2">
        {failed ? "결제가 완료되지 않았습니다" : "주문이 완료되었습니다"}
      </h1>

      {failed ? (
        <div className="text-sm text-gray-600 mb-8 space-y-1">
          <p className="text-red-600 font-semibold">
            {resultMsg || "결제 처리 중 문제가 발생했습니다."}
          </p>
          <p className="text-xs text-gray-400">오류코드: {resultCd}</p>
          {ordNum && <p className="text-xs text-gray-400">주문번호: {ordNum}</p>}
          <p className="text-xs text-gray-500 pt-2">
            결제가 이루어지지 않았습니다. 다시 시도하시거나 고객센터로 문의해 주세요.
          </p>
        </div>
      ) : (
        <div className="text-gray-500 text-sm mb-8 space-y-1">
          <p>주문 내역은 각 산지 농가로 전달되며, 순차적으로 발송 안내를 드립니다.</p>
          {ordNum && <p className="text-xs text-gray-400">주문번호: {ordNum}</p>}
          {amount && (
            <p className="text-xs text-gray-400">
              결제금액: {Number(amount).toLocaleString()}원
            </p>
          )}
          {apprNum && <p className="text-xs text-gray-400">승인번호: {apprNum}</p>}
        </div>
      )}

      <div className="flex gap-3 justify-center">
        <Link href="/mypage" className="border-2 border-brand text-brand-dark font-semibold px-5 py-2.5 rounded-full">
          주문내역 보기
        </Link>
        <Link href="/" className="bg-brand text-white font-semibold px-5 py-2.5 rounded-full">
          쇼핑 계속하기
        </Link>
      </div>
    </div>
  );
}
