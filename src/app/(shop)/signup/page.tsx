export default function SignupPage() {
  return (
    <div className="px-4 py-12">
      <h1 className="text-2xl font-bold text-center mb-8">회원가입</h1>
      <form className="space-y-3">
        <input placeholder="아이디" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm" />
        <input type="password" placeholder="비밀번호" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm" />
        <input type="password" placeholder="비밀번호 확인" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm" />
        <input placeholder="이름" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm" />
        <input placeholder="휴대전화번호" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm" />
        <input placeholder="이메일" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm" />
        <label className="flex items-center gap-2 text-xs text-gray-500 pt-2">
          <input type="checkbox" /> [필수] 이용약관 및 개인정보처리방침에 동의합니다
        </label>
        <label className="flex items-center gap-2 text-xs text-gray-500">
          <input type="checkbox" /> [선택] 마케팅 정보 수신에 동의합니다
        </label>
        <button
          type="button"
          className="w-full bg-brand text-white font-semibold py-3 rounded-full hover:bg-brand-dark transition mt-2"
        >
          가입하기
        </button>
      </form>
      <p className="text-[11px] text-gray-400 text-center mt-6">
        ※ 데모 화면으로 실제 회원가입 기능은 연동되어 있지 않습니다.
      </p>
    </div>
  );
}
