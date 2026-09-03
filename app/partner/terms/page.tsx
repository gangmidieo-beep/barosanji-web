import Link from "next/link";

export const dynamic = "force-dynamic";

export default function PartnerTerms() {
  return (
    <div style={{ minHeight: "100vh", background: "#fff8f1" }}>
      <div className="max-w-[440px] mx-auto px-5 py-8">
        <div className="text-xl font-black text-[#ff7a1a] mb-1">파트너 이용안내 · 운영정책</div>
        <p className="text-xs text-gray-500 mb-5">바로산지 제휴(추천인) 프로그램</p>

        <Section title="💰 수수료">
          상품이 팔리면 <b className="text-[#2f9e44]">판매가의 15%</b>를 수수료로 드려요. (상품에 따라 다를 수 있어요)
          수수료는 결제가 완료된 주문에만 붙고, 주문 취소·환불 건은 제외돼요.
        </Section>

        <Section title="⚡ 빠른 정산 · 금액 제한 없음">
          <b>정산 신청 최소 금액이 없어요.</b> 1원이라도 쌓이면 바로 신청 가능해요.
          신청하시면 등록하신 계좌로 <b>빠르게 지급</b>해 드려요. 쌓아둘 필요 없이 원할 때 받으세요!
        </Section>

        <Section title="🔗 어떻게 버나요?">
          ① 상품별 <b>내 링크 발급</b> → ② 인스타·블로그·SNS 등에 <b>공유</b> → ③ 그 링크로 누가 사면 <b>수수료 적립</b>.
          링크 클릭 후 24시간 안에 구매하면 인정돼요. (여러 링크를 거쳤다면 마지막에 클릭한 링크로 집계돼요)
        </Section>

        <Section title="🧾 세금">
          수수료는 <b>원천징수 없이 전액</b> 지급돼요. 세금 신고는 파트너님이 직접 하시면 돼요.
          (수익이 커지면 종합소득세 신고 대상일 수 있어요.)
        </Section>

        <Section title="📢 꼭 붙여야 하는 문구 (법적 의무)">
          링크를 공유할 때는 게시물에 아래 문구를 <b>반드시</b> 표기해야 해요. (공정거래위원회 표시·광고 기준)<br />
          <span className="block mt-2 p-2.5 bg-[#fff5ec] rounded-xl text-[12px] text-gray-700 font-medium">
            &ldquo;이 포스팅은 바로산지파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다&rdquo;
          </span>
          <span className="block mt-2">링크 복사 버튼을 누르면 이 문구가 <b>자동으로 함께 복사</b>돼요. 게시물 처음이나 끝에 눈에 띄게 넣어주세요. (더보기·해시태그 속에 숨기면 안 돼요)</span>
          <span className="block mt-1.5 text-[12px] text-gray-500">💡 스레드는 댓글에 3줄 이상 작성해야 삭제되지 않아요.</span>
        </Section>

        <Section title="🚫 이런 건 안 돼요">
          본인이 본인 링크로 사서 수수료를 챙기는 행위(자기 구매), 허위·과장 광고, 스팸성 도배는 정산이 제한될 수 있어요.
          정정당당하게 좋은 상품을 소개해주세요!
        </Section>

        <div className="text-[11px] text-gray-400 mt-6 leading-relaxed">
          운영 사정에 따라 수수료율·정책은 사전 공지 후 변경될 수 있어요. 문의는 고객센터로 주세요.
        </div>

        <Link href="/partner" className="block text-center text-sm text-[#ff7a1a] font-bold mt-8 underline">← 파트너 홈으로</Link>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm mb-3">
      <div className="text-sm font-black text-gray-800 mb-1.5">{title}</div>
      <p className="text-[13px] text-gray-600 leading-relaxed">{children}</p>
    </div>
  );
}
