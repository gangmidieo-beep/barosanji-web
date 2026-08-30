import { getSiteSettings } from "@/lib/db-settings";

export default async function Footer() {
  const s = await getSiteSettings();

  return (
    <footer className="mt-10 border-t border-gray-200 bg-gray-50">
      <div className="px-4 py-8 text-xs text-gray-500 leading-relaxed">
        <div className="flex flex-wrap gap-3 mb-4 text-xs font-medium text-gray-700">
          <span>회사소개</span>
          <span>이용약관</span>
          <span className="font-bold text-gray-900">개인정보처리방침</span>
          <span>제휴문의</span>
          <span>고객센터</span>
        </div>
        <p>상호명: {s.companyName} &nbsp;|&nbsp; 대표: {s.ceoName} &nbsp;|&nbsp; 사업자등록번호: {s.bizRegNo}</p>
        <p>통신판매업신고: {s.mailOrderNo} &nbsp;|&nbsp; 주소: {s.address}</p>
        <p>고객센터: {s.csPhone} (평일 09:00~18:00, 주말/공휴일 휴무) &nbsp;|&nbsp; 이메일: {s.csEmail}</p>
        <p className="mt-3 text-[11px] text-gray-400">
          본 사이트에서 판매되는 상품은 각 산지 농가·생산자로부터 주문 후 직접 발송되며, 배송 및
          품질에 대한 문의는 고객센터를 통해 접수해 주시기 바랍니다.
        </p>
        <p className="mt-2 text-[11px] text-gray-400">
          © {new Date().getFullYear()} 바로산지. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
