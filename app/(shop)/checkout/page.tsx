"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart-context";
import { usePoints } from "@/lib/points-context";
import { SHIPPING_FEE } from "@/lib/site-config";

const SIGNUP_BONUS_ID = "signup-bonus";
const SIGNUP_BONUS_AMOUNT = 1000;

export default function CheckoutPage() {
  const { items, totalPrice, clearCart } = useCart();
  const { balance, spendPoints, claimOnce, hasClaimed } = usePoints();
  const isMember = hasClaimed(SIGNUP_BONUS_ID);
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [usePointsChecked, setUsePointsChecked] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", address: "", detail: "" });
  const shipping = SHIPPING_FEE; // 건당 고정 배송비 정책

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

  const handleOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
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

      const res = await fetch("/api/payapp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goodname,
          price: finalTotal,
          recvphone: form.phone,
          orderId,
          receiverName: form.name,
          receiverAddress: form.address,
          receiverAddressDetail: form.detail,
          items: items.map(({ product, quantity }) => ({
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

      // 적립금 사용은 결제창으로 넘어가기 직전에 차감 (실제 서비스에서는 결제 완료 웹훅에서 확정 처리 권장)
      if (pointsUsed > 0) spendPoints(pointsUsed, `주문 결제 시 적립금 사용 - ${orderId}`);
      clearCart();
      window.location.href = data.payUrl; // 페이앱 결제창으로 이동
    } catch {
      setErrorMsg("결제 요청 중 오류가 발생했습니다.");
      setSubmitting(false);
    }
  };

  return (
    <div className="px-4 py-6">
      <h1 className="text-xl font-bold mb-5">주문/결제</h1>

      {!isMember && (
        <div className="flex items-center justify-between gap-3 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 mb-5">
          <div>
            <p className="text-sm font-bold text-gray-900">카카오로 3초 가입하고 결제하기</p>
            <p className="text-xs text-gray-500 mt-0.5">
              지금 가입하면 {SIGNUP_BONUS_AMOUNT.toLocaleString()}원 적립금 즉시 지급
            </p>
          </div>
          <button
            type="button"
            onClick={() => claimOnce(SIGNUP_BONUS_ID, SIGNUP_BONUS_AMOUNT, "카카오 간편가입 축하 적립금")}
            className="shrink-0 bg-yellow-300 text-gray-900 text-xs font-bold px-4 py-2.5 rounded-full active:scale-95 transition"
          >
            카카오 가입
          </button>
        </div>
      )}

      <form onSubmit={handleOrder} className="space-y-6">
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
            <input
              required
              placeholder="주소"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
            <input
              placeholder="상세주소"
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
            💳 페이앱(PayApp) 결제창
          </div>
          <p className="text-[11px] text-gray-400 mt-2">
            신용/체크카드, 계좌이체, 휴대폰 결제 등을 페이앱 결제창에서 선택할 수 있습니다.
            총 결제금액이 0원(적립금 전액 결제)이면 결제창 없이 바로 주문이 완료됩니다.
          </p>
        </section>

        {errorMsg && (
          <div className="text-sm text-red-500 bg-red-50 rounded-lg p-3">{errorMsg}</div>
        )}

        <div className="border-t border-gray-100 pt-4 space-y-1.5">
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

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-gradient-to-r from-brand to-brand-dark text-white font-semibold py-3.5 rounded-full shadow-md shadow-brand/30 active:scale-[0.98] transition disabled:opacity-60"
        >
          {submitting
            ? "결제창 연결 중..."
            : finalTotal <= 0
            ? "적립금으로 결제 완료하기"
            : `${finalTotal.toLocaleString()}원 페이앱으로 결제하기`}
        </button>
      </form>
    </div>
  );
}
