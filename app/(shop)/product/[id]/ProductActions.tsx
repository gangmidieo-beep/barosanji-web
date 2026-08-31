"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Product, getMaxQty } from "@/lib/data";
import { useCart } from "@/lib/cart-context";

export default function ProductActions({ product }: { product: Product }) {
  const max = getMaxQty(product);
  const hasOptions = !!product.options && product.options.length > 0;
  const [optionIndex, setOptionIndex] = useState(0);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const { addItem } = useCart();
  const router = useRouter();

  const selectedOption = hasOptions ? product.options![optionIndex] : null;
  const unitPrice = selectedOption ? selectedOption.price : product.price;

  // 옵션을 고른 경우, 장바구니에는 옵션별로 다른 상품처럼 담기도록 id/가격/단위를 바꿔서 넣음
  const cartProduct: Product = useMemo(() => {
    if (!selectedOption) return product;
    return {
      ...product,
      id: `${product.id}::${selectedOption.label}`,
      price: selectedOption.price,
      unit: selectedOption.label,
    };
  }, [product, selectedOption]);

  const handleAdd = () => {
    addItem(cartProduct, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  };

  return (
    <>
      {product.soldOut ? (
        <>
          <div className="fixed bottom-16 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white border-t border-gray-100 px-4 pt-4 pb-4 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] z-30">
            <button
              disabled
              className="w-full bg-gray-200 text-gray-500 font-semibold py-3.5 rounded-full cursor-not-allowed"
            >
              일시 품절된 상품입니다
            </button>
            <p className="text-[11px] text-gray-400 text-center mt-2">
              재입고되면 다시 구매하실 수 있어요. 카카오톡 상담으로 재입고 알림을 문의해보세요.
            </p>
          </div>
          <div className="h-32" />
        </>
      ) : (
        <>
          {hasOptions && (
            <div className="px-4 mt-6 pt-4 border-t border-gray-100">
              <span className="text-sm text-gray-600 block mb-1.5">옵션 선택</span>
              <select
                value={optionIndex}
                onChange={(e) => setOptionIndex(Number(e.target.value))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-800"
              >
                {product.options!.map((opt, i) => (
                  <option key={opt.label} value={i}>
                    {opt.label} · {opt.price.toLocaleString()}원
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 장바구니/구매 버튼을 스크롤 안 하고도 바로 누를 수 있게, 화면 하단(탭바 위)에 고정 */}
          <div className="fixed bottom-16 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white border-t border-gray-100 px-4 pt-3 pb-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] z-30">
            {added && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 -translate-y-full bg-gray-900 text-white text-xs font-medium px-4 py-2 rounded-full shadow-lg animate-pop-in whitespace-nowrap">
                🛒 장바구니에 담았어요!
              </div>
            )}

            <div className="flex items-center gap-3 mb-1.5">
              <span className="text-sm text-gray-600">수량</span>
              <div className="flex items-center border border-gray-200 rounded-full">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="w-8 h-8 text-gray-500 hover:text-brand-dark active:scale-90 transition-transform"
                >
                  -
                </button>
                <span className="w-8 text-center text-sm">{qty}</span>
                <button
                  onClick={() => setQty((q) => Math.min(max, q + 1))}
                  disabled={qty >= max}
                  className="w-8 h-8 text-gray-500 hover:text-brand-dark active:scale-90 transition-transform disabled:text-gray-200 disabled:hover:text-gray-200"
                >
                  +
                </button>
              </div>
              <span className="text-sm text-gray-500 ml-auto">
                합계 <b className="text-gray-900">{(unitPrice * qty).toLocaleString()}원</b>
              </span>
            </div>
            <p className="text-[11px] text-gray-400 mb-2">1인당 최대 {max}개까지 구매 가능해요</p>

            <div className="flex gap-3">
              <button
                onClick={handleAdd}
                className="flex-1 border-2 border-brand text-brand-dark font-semibold py-3 rounded-full hover:bg-brand-light active:scale-[0.97] transition"
              >
                장바구니 담기
              </button>
              <button
                onClick={() => {
                  addItem(cartProduct, qty);
                  router.push("/checkout");
                }}
                className="flex-1 bg-gradient-to-r from-brand to-brand-dark text-white font-semibold py-3 rounded-full shadow-md shadow-brand/30 active:scale-[0.97] transition"
              >
                바로 구매
              </button>
            </div>
          </div>

          {/* 화면 하단 고정 바에 콘텐츠가 가려지지 않도록 여백 확보 */}
          <div className="h-40" />
        </>
      )}
    </>
  );
}
