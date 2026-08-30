"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePoints } from "@/lib/points-context";

const SIGNUP_BONUS_ID = "signup-bonus";
const SIGNUP_BONUS_AMOUNT = 1000;

export default function LoginPage() {
  const router = useRouter();
  const { claimOnce, hasClaimed } = usePoints();
  const isMember = hasClaimed(SIGNUP_BONUS_ID);

  const handleKakaoLogin = () => {
    // 데모: 실제 카카오 로그인 연동은 카카오 디벨로퍼스 REST API 키/리다이렉트 URI 등록이 필요해요.
    if (!isMember) claimOnce(SIGNUP_BONUS_ID, SIGNUP_BONUS_AMOUNT, "카카오 간편가입 축하 적립금");
    router.push("/mypage");
  };

  return (
    <div className="px-4 py-12">
      <h1 className="text-2xl font-bold text-center mb-8">로그인</h1>
      <form className="space-y-3">
        <input placeholder="아이디" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm" />
        <input type="password" placeholder="비밀번호" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm" />
        <button
          type="button"
          className="w-full bg-brand text-white font-semibold py-3 rounded-full hover:bg-brand-dark transition"
        >
          로그인
        </button>
      </form>
      <div className="flex justify-center gap-2 mt-3 text-xs text-gray-400">
        <Link href="/signup" className="hover:text-brand-dark">회원가입</Link>
        <span>|</span>
        <span className="hover:text-brand-dark cursor-pointer">아이디 찾기</span>
        <span>|</span>
        <span className="hover:text-brand-dark cursor-pointer">비밀번호 찾기</span>
      </div>
      <div className="mt-6 space-y-2">
        <button
          type="button"
          onClick={handleKakaoLogin}
          className="w-full bg-yellow-300 font-semibold py-3 rounded-full text-sm active:scale-[0.98] transition"
        >
          카카오로 시작하기{!isMember && ` (+${SIGNUP_BONUS_AMOUNT.toLocaleString()}원)`}
        </button>
        <button type="button" className="w-full bg-green-500 text-white font-semibold py-3 rounded-full text-sm">
          네이버로 시작하기
        </button>
      </div>
      <p className="text-[11px] text-gray-400 text-center mt-6">
        ※ 데모 화면입니다 — 아이디/비밀번호 로그인은 아직 연동 전이고, 카카오 버튼은 가입 적립금
        지급까지만 데모로 동작해요. 실제 카카오 로그인은 카카오 앱 키 연동이 필요해요.
      </p>
    </div>
  );
}
