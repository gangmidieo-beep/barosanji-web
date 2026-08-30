"use client";

import { useEffect, useState } from "react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { useSuppliers } from "@/lib/supplier-store";

type SettingsForm = {
  companyName: string;
  ceoName: string;
  bizRegNo: string;
  mailOrderNo: string;
  address: string;
  csPhone: string;
  csEmail: string;
  kakaoChannelUrl: string;
};

const EMPTY: SettingsForm = {
  companyName: "",
  ceoName: "",
  bizRegNo: "",
  mailOrderNo: "",
  address: "",
  csPhone: "",
  csEmail: "",
  kakaoChannelUrl: "",
};

export default function SettingsAdminPage() {
  const { suppliers, addSupplier, updateSupplier, removeSupplier } = useSuppliers();
  const [form, setForm] = useState<SettingsForm>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setForm(data.settings);
        setLoading(false);
      });
  }, []);

  const update = (key: keyof SettingsForm, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setSaved(true);
  };

  return (
    <div>
      <AdminPageHeader title="설정" description="사업자 정보, 고객센터 연락처를 관리합니다." />

      <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg px-4 py-3 mb-5">
        ✅ 실제 데이터베이스에 저장됩니다. 아래에서 "저장"을 누르면 실제 사이트 하단(회사 정보)에도
        반영돼요. (Footer.tsx가 이 값을 실시간으로 읽어오도록 연결되어 있어야 합니다 — 아직 연결 전이라면
        알려주시면 마저 연결해드릴게요.)
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-6 max-w-xl space-y-4">
        {loading ? (
          <p className="text-sm text-gray-400">불러오는 중...</p>
        ) : (
          <>
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
                onClick={handleSave}
                disabled={saving}
                className="bg-brand text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-brand-dark transition disabled:opacity-60"
              >
                {saving ? "저장 중..." : "저장"}
              </button>
              {saved && <span className="text-xs text-brand-dark">저장되었어요.</span>}
            </div>
          </>
        )}
      </div>

      <div className="mt-8">
        <h2 className="text-base font-bold text-gray-900 mb-1">거래처 (공급업체) 관리</h2>
        <p className="text-xs text-gray-500 mb-3">
          관리자만 볼 수 있는 화면입니다 (고객 화면에는 절대 노출되지 않습니다). 업체 이름을 직접
          등록하면 상품 등록 화면의 "공급업체" 목록에도 바로 반영돼요.
        </p>

        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg px-4 py-3 mb-4">
          ⚠️ 어드민플러스 client_id/client_secret은 보안을 위해 이 화면에서 입력받지 않습니다. 발급받은
          값을 그대로 알려주시면, 아래 환경변수 이름으로 Railway 서버에 안전하게 등록해드릴게요.
        </div>

        <div className="bg-white border border-gray-100 rounded-xl p-6 max-w-xl space-y-5">
          {suppliers.map((s) => (
            <div key={s.id} className="border-b border-gray-100 last:border-0 pb-5 last:pb-0">
              <div className="flex items-center gap-2 mb-2">
                <input
                  placeholder="거래처 이름 (예: OO청과)"
                  value={s.name}
                  onChange={(e) => updateSupplier(s.id, "name", e.target.value)}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`"${s.name || "이름 없음"}" 거래처를 삭제할까요? 이 업체로 등록된 상품이 있다면 먼저 다른 업체로 옮겨주세요.`))
                      removeSupplier(s.id);
                  }}
                  className="shrink-0 text-xs text-gray-400 hover:text-red-500 px-2"
                >
                  삭제
                </button>
              </div>
              <p className="text-[11px] text-gray-400">
                환경변수: ADMINPLUS_CLIENT_ID_{s.envKey} / ADMINPLUS_CLIENT_SECRET_{s.envKey}
              </p>
            </div>
          ))}

          <button
            type="button"
            onClick={addSupplier}
            className="w-full border-2 border-dashed border-gray-200 text-gray-500 text-sm font-semibold py-2.5 rounded-lg hover:border-brand hover:text-brand-dark transition"
          >
            + 거래처 추가
          </button>
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
