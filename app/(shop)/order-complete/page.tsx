import Link from "next/link";

export default function OrderCompletePage() {
  return (
    <div className="px-4 py-24 text-center">
      <p className="text-6xl mb-4">✅</p>
      <h1 className="text-2xl font-bold mb-2">주문이 완료되었습니다</h1>
      <p className="text-gray-500 text-sm mb-8">
        주문 내역은 각 산지 농가로 전달되며, 순차적으로 발송 안내를 드립니다.
        <br />
        (데모 화면 — 실제 주문/결제는 처리되지 않았습니다)
      </p>
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
