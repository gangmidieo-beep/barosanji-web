"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePoints } from "@/lib/points-context";

const SIGNUP_BONUS_ID = "signup-bonus";
const SIGNUP_BONUS_AMOUNT = 1000;

export default function SignupPage() {
  const router = useRouter();
  const { claimOnce, hasClaimed } = usePoints();
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const alreadyMember = hasClaimed(SIGNUP_BONUS_ID);

  const finishSignup = (label: string) => {
    claimOnce(SIGNUP_BONUS_ID, SIGNUP_BONUS_AMOUNT, label);
    router.push("/mypage");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agree) {
      setError("[필수] 이용약관 및 개인정보처리방침 동의가 필요해요.");
      return;
    }
    finishSignup("회원가입 축하 적립금");
  };

  const handleKakaoSignup = () => {
    // 데모: 실제 카카오 로그인 연동은 카카오 디벨로퍼스에서 발급받은 REST API 키 /
    // 리다이렉트 URI 등록이 필요해요. 실제 값을 알려주시면 연결해드릴게요.
    finishSignup("카카오 간편가입 축하 적립금");
  };

  return (
    <div className="px-4 py-12">
      <h1 className="text-2xl font-bold text-center mb-2">회원가입</h1>
      {!alreadyMember && (
        <p className="text-center text-xs text-brand-dark font-semibold mb-8">
          지금 가입하면 {SIGNUP_BONUS_AMOUNT.toLocaleString()}원 적립금을 드려요 🎁
        </p>
      )}

      <button
        type="button"
        onClick={handleKakaoSignup}
        className="w-full bg-yellow-300 font-semibold py-3 rounded-full text-sm mb-3 active:scale-[0.98] transition"
      >
        카카오로 3초만에 가입하기
      </button>
      <div className="flex items-center gap-3 my-4 text-xs text-gray-300">
        <div className="flex-1 h-px bg-gray-100" />
        또는
        <div className="flex-1 h-px bg-gray-100" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input placeholder="아이디" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm" />
        <input type="password" placeholder="비밀번호" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm" />
        <input type="password" placeholder="비밀번호 확인" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm" />
        <input placeholder="이름" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm" />
        <input placeholder="휴대전화번호" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm" />
        <input placeholder="이메일" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm" />
        <label className="flex items-center gap-2 text-xs text-gray-500 pt-2">
          <input
            type="checkbox"
            checked={agree}
            onChange={(e) => {
              setAgree(e.target.checked);
              setError(null);
            }}
          />{" "}
          [필수] 이용약관 및 개인정보처리방침에 동의합니다
        </label>
        <label className="flex items-center gap-2 text-xs text-gray-500">
          <input type="checkbox" /> [선택] 마케팅 정보 수신에 동의합니다
        </label>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <button
          type="submit"
          className="w-full bg-brand text-white font-semibold py-3 rounded-full hover:bg-brand-dark transition mt-2"
        >
          가입하기
        </button>
      </form>
      <p className="text-[11px] text-gray-400 text-center mt-6">
        ※ 데모 화면입니다 — 아이디/비밀번호 등은 저장되지 않고, 적립금 지급만 이 브라우저에 기록돼요.
        실제 회원 가입·로그인(카카오 포함)을 붙이려면 실제 DB와 카카오 앱 키 연동이 필요해요.
      </p>
    </div>
  );
}
