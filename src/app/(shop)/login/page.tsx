import Link from "next/link";

export default function LoginPage() {
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
        <button type="button" className="w-full bg-yellow-300 font-semibold py-3 rounded-full text-sm">
          카카오로 시작하기
        </button>
        <button type="button" className="w-full bg-green-500 text-white font-semibold py-3 rounded-full text-sm">
          네이버로 시작하기
        </button>
      </div>
      <p className="text-[11px] text-gray-400 text-center mt-6">
        ※ 데모 화면으로 실제 로그인 기능은 연동되어 있지 않습니다.
      </p>
    </div>
  );
}
