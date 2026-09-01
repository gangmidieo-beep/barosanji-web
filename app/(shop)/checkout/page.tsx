"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart-context";
import { usePoints } from "@/lib/points-context";
import { SHIPPING_FEE } from "@/lib/site-config";

const SIGNUP_BONUS_ID = "signup-bonus";
const SIGNUP_BONUS_AMOUNT = 1000;

// 다음(카카오) 우편번호 서비스 — 스크립트를 딱 한 번만 불러오도록 캐싱
let daumPostcodeLoading: Promise<void> | null = null;
function loadDaumPostcodeScript(): Promise<void> {
  if (typeof window !== "undefined" && (window as unknown as { daum?: unknown }).daum) {
    return Promise.resolve();
  }
  if (!daumPostcodeLoading) {
    daumPostcodeLoading = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("우편번호 서비스를 불러오지 못했습니다."));
      document.head.appendChild(script);
    });
  }
  return daumPostcodeLoading;
}

type DaumPostcodeData = {
  zonecode: string;
  roadAddress: string;
  jibunAddress: string;
};

export default function CheckoutPage() {
  const { items, totalPrice, clearCart } = useCart();
  const { balance, spendPoints, claimOnce, hasClaimed } = usePoints();
  const [kakaoSession, setKakaoSession] = useState<{ kakaoId: string; nickname: string } | null>(
    null
  );
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [usePointsChecked, setUsePointsChecked] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", address: "", detail: "" });
  const detailInputRef = useRef<HTMLInputElement>(null);
  const [addressLoading, setAddressLoading] = useState(false);
  const shipping = SHIPPING_FEE; // 건당 고정 배송비 정책

  // 실제 카카오 로그인 여부를 서버(쿠키)에서 확인
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data?.session) setKakaoSession(data.session);
      })
      .catch(() => {});
  }, []);

  // 실제로 카카오 로그인이 된 상태에서, 이 브라우저가 아직 가입 축하 적립금을 받은 적이
  // 없으면 1회 지급한다. (localStorage 기준 — 여러 기기 간 중복 지급까지 막지는 못함)
  useEffect(() => {
    if (kakaoSession && !hasClaimed(SIGNUP_BONUS_ID)) {
      claimOnce(SIGNUP_BONUS_ID, SIGNUP_BONUS_AMOUNT, "카카오 로그인 축하 적립금");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kakaoSession]);

  const openAddressSearch = async () => {
    setAddressLoading(true);
    try {
      await loadDaumPostcodeScript();
      const daum = (window as unknown as { daum: { Postcode: new (opts: {
        oncomplete: (data: DaumPostcodeData) => void;
      }) => { open: () => void } } }).daum;
      new daum.Postcode({
        oncomplete: (data: DaumPostcodeData) => {
          const roadAddr = data.roadAddress || data.jibunAddress;
          setForm((f) => ({ ...f, address: `(${data.zonecode}) ${roadAddr}` }));
          // 주소를 고르고 나면 바로 상세주소(동/호수)를 입력하도록 포커스를 옮겨준다.
          setTimeout(() => detailInputRef.current?.focus(), 100);
        },
      }).open();
    } catch {
      alert("우편번호 서비스를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setAddressLoading(false);
    }
  };

  const maxUsable = useMemo(
    () => Math.min(balance, totalPrice + shipping),
    [balance, totalPrice, shipping]
  );
  const pointsUsed = usePointsChecked ? maxUsable : 0;
  const finalTotal = totalPrice + shipping - pointsUsed;

  if (items.length === 0) {
    return (
      <div className="px-4 py-24 text-center text-gray-400">
        주문할 상품이 없습니다.
      </div>
    );
  }

  const handleOrder = async (payType: "auth" | "easy") => {
    setErrorMsg(null);

    if (!form.name.trim() || !form.phone.trim() || !form.address.trim()) {
      setErrorMsg("받는 분 성함·연락처·주소를 모두 입력해주세요.");
      return;
    }
    setSubmitting(true);

    const orderId = `ORD-${Date.now()}`;

    try {
      if (finalTotal <= 0) {
        // 적립금만으로 전액 결제되는 경우 PG 호출 없이 바로 완료 처리 (주문 내역은 DB에 기록)
        await fetch("/api/orders/free", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId,
            receiverName: form.name,
            recvphone: form.phone,
            receiverAddress: form.address,
            receiverAddressDetail: form.detail,
            amount: 0,
            items: items.map(({ product, quantity }) => ({
              name: product.name,
              unit: product.unit,
              quantity,
              price: product.price,
              supplierId: product.supplierId,
            })),
          }),
        }).catch(() => null);
        if (pointsUsed > 0) spendPoints(pointsUsed, `주문 결제(적립금 전액) - ${orderId}`);
        clearCart();
        router.push("/order-complete");
        return;
      }

      const goodname =
        items.length === 1
          ? items[0].product.name
          : `${items[0].product.name} 외 ${items.length - 1}건`;

            const res = await fetch("/api/paymap/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goodname,
          payType,
          price: finalTotal,
          recvphone: form.phone,
          orderId,
          receiverName: form.name,
          receiverAddress: form.address,
          receiverAddressDetail: form.detail,
          items: items.map(({ product, quantity }) => ({
            productId: product.id,
            name: product.name,
            unit: product.unit,
            quantity,
            price: product.price,
            supplierId: product.supplierId,
          })),
        }),
      });
      const data = await res.json();

      if (!data.success) {
        setErrorMsg(data.errorMessage ?? "결제 요청에 실패했습니다.");
        setSubmitting(false);
        return;
      }

      // 적립금 사용은 결제창으로 넘어가기 직전에 차감
      if (pointsUsed > 0) spendPoints(pointsUsed, `주문 결제 시 적립금 사용 - ${orderId}`);
      clearCart();

      // 페이맵은 리다이렉트가 아니라 form POST 방식이라, 폼을 만들어 즉시 전송한다.
      const payForm = document.createElement("form");
      payForm.method = "POST";
      payForm.action = data.action;
      payForm.acceptCharset = "utf-8";
      Object.entries(data.fields as Record<string, string>).forEach(([k, v]) => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = k;
        input.value = v ?? "";
        payForm.appendChild(input);
      });
      document.body.appendChild(payForm);
      payForm.submit();
    } catch {
      setErrorMsg("결제 요청 중 오류가 발생했습니다.");
      setSubmitting(false);
    }
  };

  return (
    <div className="px-4 py-6">
      <h1 className="text-xl font-bold mb-5">주문/결제</h1>

      {!kakaoSession ? (
        <div className="flex items-center justify-between gap-3 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 mb-5">
          <div>
            <p className="text-sm font-bold text-gray-900">카카오로 3초 로그인하고 결제하기</p>
            <p className="text-xs text-gray-500 mt-0.5">
              처음 로그인하면 {SIGNUP_BONUS_AMOUNT.toLocaleString()}원 적립금 즉시 지급
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              window.location.href = "/api/auth/kakao/login?next=/checkout";
            }}
            className="shrink-0 bg-yellow-300 text-gray-900 text-xs font-bold px-4 py-2.5 rounded-full active:scale-95 transition"
          >
            카카오 로그인
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3 bg-brand-light/50 rounded-xl px-4 py-3 mb-5">
          <p className="text-sm font-semibold text-gray-800">
            👋 {kakaoSession.nickname}님, 안녕하세요
          </p>
          <a href="/api/auth/logout?next=/checkout" className="text-xs text-gray-400 underline shrink-0">
            로그아웃
          </a>
        </div>
      )}

         <form id="checkout-form" onSubmit={(e) => e.preventDefault()} className="space-y-6 pb-40">
        <section className="border border-gray-100 rounded-xl p-5">
          <h2 className="font-bold mb-4">배송지 정보</h2>
          <div className="grid gap-3">
            <input
              required
              placeholder="받는 분"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
            <input
              required
              placeholder="휴대전화번호 ('-' 없이 숫자만)"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
            <div className="flex gap-2">
              <input
                required
                readOnly
                placeholder="주소 (검색 버튼을 눌러주세요)"
                value={form.address}
                onClick={openAddressSearch}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 cursor-pointer"
              />
              <button
                type="button"
                onClick={openAddressSearch}
                disabled={addressLoading}
                className="shrink-0 border border-brand text-brand-dark text-sm font-medium px-3 py-2 rounded-lg disabled:opacity-60"
              >
                {addressLoading ? "불러오는 중..." : "주소 검색"}
              </button>
            </div>
            <input
              ref={detailInputRef}
              placeholder="상세주소 (동/호수 등)"
              value={form.detail}
              onChange={(e) => setForm((f) => ({ ...f, detail: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
            <textarea placeholder="배송 요청사항 (선택)" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" rows={2} />
          </div>
        </section>

        <section className="border border-gray-100 rounded-xl p-5">
          <h2 className="font-bold mb-4">주문 상품 ({items.length})</h2>
          <div className="space-y-2 text-sm">
            {items.map(({ product, quantity }) => (
              <div key={product.id} className="flex justify-between text-gray-600">
                <span className="truncate pr-2">
                  {product.name} ({product.unit}) x {quantity}
                </span>
                <span className="shrink-0">{(product.price * quantity).toLocaleString()}원</span>
              </div>
            ))}
          </div>
        </section>

        <section className="border border-gray-100 rounded-xl p-5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-bold">적립금 사용</h2>
            <span className="text-xs text-gray-400">보유 {balance.toLocaleString()}원</span>
          </div>
          {balance > 0 ? (
            <label className="flex items-center justify-between cursor-pointer mt-2 bg-brand-light/50 rounded-lg px-3 py-2.5">
              <span className="text-sm text-gray-700">
                최대 {maxUsable.toLocaleString()}원 사용 가능
              </span>
              <input
                type="checkbox"
                checked={usePointsChecked}
                onChange={(e) => setUsePointsChecked(e.target.checked)}
                className="w-5 h-5 accent-brand"
              />
            </label>
          ) : (
            <p className="text-xs text-gray-400 mt-1">
              보유 적립금이 없어요. 퀴즈를 풀면 적립금을 모을 수 있어요 🎯
            </p>
          )}
        </section>

        <section className="border border-gray-100 rounded-xl p-5">
          <h2 className="font-bold mb-4">결제 수단</h2>
          <div className="flex items-center gap-2 bg-brand-light/50 rounded-lg px-3 py-2.5 text-sm text-brand-dark font-semibold">
            💳결제창
          </div>
          <p className="text-[11px] text-gray-400 mt-2">
            신용/체크카드, 계좌이체, 휴대폰 결제 등을 페이앱 결제창에서 선택할 수 있습니다.
            총 결제금액이 0원(적립금 전액 결제)이면 결제창 없이 바로 주문이 완료됩니다.
          </p>
        </section>

      </form>

      {/* 결제 버튼을 스크롤 안 하고도 바로 누를 수 있게, 화면 하단(탭바 위)에 고정 */}
      <div className="fixed bottom-16 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white border-t border-gray-100 px-4 pt-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] z-30">
        {errorMsg && (
          <div className="text-sm text-red-500 bg-red-50 rounded-lg p-3 mb-3">{errorMsg}</div>
        )}

        <div className="space-y-1.5 mb-3">
          <div className="flex justify-between text-sm text-gray-500">
            <span>상품 금액</span>
            <span>{totalPrice.toLocaleString()}원</span>
          </div>
          <div className="flex justify-between text-sm text-gray-500">
            <span>배송비</span>
            <span className="font-medium">{shipping.toLocaleString()}원</span>
          </div>
          {pointsUsed > 0 && (
            <div className="flex justify-between text-sm text-brand-dark">
              <span>적립금 사용</span>
              <span>-{pointsUsed.toLocaleString()}원</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg pt-1">
            <span>총 결제금액</span>
            <span>{finalTotal.toLocaleString()}원</span>
          </div>
        </div>

         {finalTotal <= 0 ? (
          <button
            type="button"
            onClick={() => handleOrder("auth")}
            disabled={submitting}
            className="w-full bg-gradient-to-r from-brand to-brand-dark text-white font-semibold py-3.5 rounded-full shadow-md shadow-brand/30 active:scale-[0.98] transition disabled:opacity-60 mb-3"
          >
            {submitting ? "처리 중..." : "적립금으로 결제 완료하기"}
          </button>
        ) : (
          <div className="space-y-2 mb-3">
            <button
              type="button"
              onClick={() => handleOrder("auth")}
              disabled={submitting}
              className="w-full bg-gradient-to-r from-brand to-brand-dark text-white font-semibold py-3.5 rounded-full shadow-md shadow-brand/30 active:scale-[0.98] transition disabled:opacity-60"
            >
              {submitting ? "결제창 연결 중..." : `신용카드로 ${finalTotal.toLocaleString()}원 결제`}
            </button>
            <button
              type="button"
              onClick={() => handleOrder("easy")}
              disabled={submitting}
              className="w-full bg-[#FEE500] text-[#3C1E1E] font-semibold py-3.5 rounded-full active:scale-[0.98] transition disabled:opacity-60"
            >
              {submitting ? "결제창 연결 중..." : "카카오페이 · 네이버페이로 결제"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
