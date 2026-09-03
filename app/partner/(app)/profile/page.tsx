import { requirePartner } from "@/lib/partner-session";
import ProfileForm from "@/components/partner/ProfileForm";

export const dynamic = "force-dynamic";

export default async function PartnerProfile() {
  const partner = await requirePartner();
  return (
    <div className="px-4">
      <div className="text-[16px] font-black text-[#ff7a1a] mb-3">👤 내정보</div>
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-3">
        <div className="text-xs text-gray-400">이메일</div>
        <div className="text-sm font-medium">{partner.email}</div>
        <div className="text-xs text-gray-400 mt-3">내 추천 코드</div>
        <div className="text-sm font-mono font-bold text-[#ff7a1a]">{partner.refCode}</div>
      </div>
      <ProfileForm initial={{ bankName: partner.bankName, bankAccount: partner.bankAccount, bankHolder: partner.bankHolder }} />
    </div>
  );
}
