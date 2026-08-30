import { KAKAO_CHANNEL_URL } from "@/lib/site-config";

const notices = [
  { title: "[안내] 추석 명절 배송 일정 안내", date: "2026-08-20" },
  { title: "[공지] 산지 사정에 따른 일부 상품 품절 안내", date: "2026-08-15" },
  { title: "바로산지 오픈 이벤트 안내", date: "2026-08-01" },
];

const inquiries = [
  { title: "배송은 얼마나 걸리나요?", date: "2026-08-24", answered: true },
  { title: "여러 상품을 한 번에 주문하면 배송비는 어떻게 되나요?", date: "2026-08-22", answered: true },
  { title: "취소/환불 규정이 궁금합니다", date: "2026-08-19", answered: false },
];

export default function BoardPage() {
  return (
    <div className="px-4 py-6">
      <h1 className="text-xl font-bold mb-5">고객센터</h1>

      <section className="mb-10">
        <h2 className="font-bold mb-3 pb-2 border-b border-gray-100">공지사항</h2>
        <ul className="divide-y divide-gray-100">
          {notices.map((n) => (
            <li key={n.title} className="py-3 flex justify-between text-sm">
              <span>{n.title}</span>
              <span className="text-gray-400 text-xs">{n.date}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-bold mb-3 pb-2 border-b border-gray-100">상품/배송 문의</h2>
        <ul className="divide-y divide-gray-100">
          {inquiries.map((n) => (
            <li key={n.title} className="py-3 flex justify-between text-sm">
              <span>{n.title}</span>
              <span className={`text-xs ${n.answered ? "text-brand-dark" : "text-gray-400"}`}>
                {n.answered ? "답변완료" : "답변대기"}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-8 bg-brand-light rounded-xl p-5 text-sm text-gray-700">
        📞 전화 상담: 1588-0000 (평일 09:00~18:00)
        <br />
        💬 카카오톡 채널:{" "}
        <a href={KAKAO_CHANNEL_URL} target="_blank" rel="noopener noreferrer" className="text-brand-dark font-semibold underline">
          바로산지 채널 바로가기
        </a>
        <br />
        ✉️ 이메일: cs@farm-mall.example
      </div>
    </div>
  );
}
