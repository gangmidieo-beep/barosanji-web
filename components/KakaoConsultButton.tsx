import { KAKAO_CHANNEL_URL } from "@/lib/site-config";

/**
 * 화면 우하단에 떠 있는 카카오톡 상담 바로가기 버튼.
 * 모바일/데스크톱 공통 레이아웃(app-shell) 안에 고정되어 어느 화면에서나 보임.
 */
export default function KakaoConsultButton() {
  return (
    <a
      href={KAKAO_CHANNEL_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="absolute bottom-[76px] right-3 z-30 flex items-center gap-1.5 bg-[#FEE500] text-[#3C1E1E] font-bold text-sm px-4 py-2.5 rounded-full shadow-lg active:scale-95 transition"
      aria-label="카카오톡 상담"
    >
      <span className="text-base">💬</span>
      <span>카톡상담</span>
    </a>
  );
}
