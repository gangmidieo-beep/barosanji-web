"use client";

import { useState } from "react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { KAKAO_CHANNEL_URL } from "@/lib/site-config";
import { suppliers } from "@/lib/suppliers";

type SupplierKeyForm = { clientId: string; clientSecret: string };

export default function SettingsAdminPage() {
  const [form, setForm] = useState({
    companyName: "(주)바로산지",
    ceoName: "홍길동",
    bizRegNo: "000-00-00000",
    mailOrderNo: "제0000-경기용인-0000호",
    address: "경기도 용인시 000로 00",
    csPhone: "1588-0000",
    csEmail: "cs@farm-mall.example",
    kakaoChannelUrl: KAKAO_CHANNEL_URL,
  });
  const [saved, setSaved] = useState(false);

  const [supplierKeys, setSupplierKeys] = useState<Record<string, SupplierKeyForm>>(() =>
    Object.fromEntries(suppliers.map((s) => [s.envKey, { clientId: "", clientSecret: "" }]))
  );
  const [supplierSaved, setSupplierSaved] = useState(false);

  const updateSupplierKey = (envKey: string, field: keyof SupplierKeyForm, value: string) => {
    setSupplierKeys((prev) => ({ ...prev, [envKey]: { ...prev[envKey], [field]: value } }));
    setSupplierSaved(false);
  };

  const update = (key: keyof typeof form, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  };

  return (
    <div>
      <AdminPageHeader title="설정" description="사업자 정보, 고객센터 연락처를 관리합니다." />

      <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg px-4 py-3 mb-5">
        ⚠️ 데모 화면입니다 — 아래 값들은 현재 코드(Footer.tsx, site-config.ts)에 하드코딩되어 있어서,
        여기서 "저장"을 눌러도 실제 사이트에는 반영되지 않습니다. 실제 값을 알려주시면 코드에 직접
        반영해드릴게요. (실제 서비스 전환 시에는 이 화면이 DB/환경변수를 읽고 쓰도록 연결해야 합니다)
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-6 max-w-xl space-y-4">
        <Field label="상호명" value={form.companyName} onChange={(v) => update("companyName", v)} />
        <Field label="대표자명" value={form.ceoName} onChange={(v) => update("ceoName", v)} />
        <Field label="사업자등록번호" value={form.bizRegNo} onChange={(v) => update("bizRegNo", v)} />
        <Field label="통신판매업신고번호" value={form.mailOrderNo} onChange={(v) => update("mailOrderNo", v)} />
        <Field label="주소" value={form.address} onChange={(v) => update("address", v)} />
        <Field label="고객센터 전화번호" value={form.csPhone} onChange={(v) => update("csPhone", v)} />
        <Field label="고객센터 이메일" value={form.csEmail} onChange={(v) => update("csEmail", v)} />
        <Field label="카카오톡 채널 링크" value={form.kakaoChannelUrl} onChange={(v) => update("kakaoChannelUrl", v)} />

        <div className="pt-2 flex items-center gap-3">
          <button
            onClick={() => setSaved(true)}
            className="bg-brand text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-brand-dark transition"
          >
            저장
          </button>
          {saved && <span className="text-xs text-brand-dark">화면에는 반영됐지만, 실제 배포에는 반영되지 않았어요.</span>}
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-base font-bold text-gray-900 mb-1">공급업체 API 연동 정보</h2>
        <p className="text-xs text-gray-500 mb-3">
          관리자만 볼 수 있는 화면입니다 (고객 화면에는 절대 노출되지 않습니다). 업체별 어드민플러스
          client_id / client_secret을 확인·관리하는 곳이에요.
        </p>

        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg px-4 py-3 mb-4">
          ⚠️ 여기 입력한 값은 이 화면(브라우저 세션)에서만 보이고, 실제 발주에는 쓰이지 않습니다. 실제
          발주가 정상 작동하려면 아래 입력 후 저에게 그대로 알려주시면, 제가 레일웨이 서버 환경변수에
          안전하게 등록해드릴게요. (이 화면 자체가 실제 키를 저장하는 곳은 아니에요)
        </div>

        <div className="bg-white border border-gray-100 rounded-xl p-6 max-w-xl space-y-5">
          {suppliers.map((s) => (
            <div key={s.id} className="border-b border-gray-100 last:border-0 pb-5 last:pb-0">
              <p className="text-sm font-semibold text-gray-800 mb-0.5">{s.name}</p>
              <p className="text-[11px] text-gray-400 mb-2">
                환경변수: ADMINPLUS_CLIENT_ID_{s.envKey} / ADMINPLUS_CLIENT_SECRET_{s.envKey}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">client_id</label>
                  <input
                    type="password"
                    autoComplete="off"
                    value={supplierKeys[s.envKey]?.clientId ?? ""}
                    onChange={(e) => updateSupplierKey(s.envKey, "clientId", e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">client_secret</label>
                  <input
                    type="password"
                    autoComplete="off"
                    value={supplierKeys[s.envKey]?.clientSecret ?? ""}
                    onChange={(e) => updateSupplierKey(s.envKey, "clientSecret", e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>
          ))}

          <div className="pt-1 flex items-center gap-3">
            <button
              onClick={() => setSupplierSaved(true)}
              className="bg-brand text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-brand-dark transition"
            >
              저장
            </button>
            {supplierSaved && (
              <span className="text-xs text-brand-dark">
                화면에만 저장됐어요. 실제 발주 연동은 이 값을 저에게 전달해주셔야 반영됩니다.
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-xs text-gray-500 block mb-1">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
      />
    </div>
  );
}
