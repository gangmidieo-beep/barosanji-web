"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Product, getMaxQty } from "@/lib/data";
import { useCart } from "@/lib/cart-context";
import { SHIPPING_FEE } from "@/lib/site-config";

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
    <div className="px-4 mt-6 pt-4 border-t border-gray-100 relative">
      {added && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 -translate-y-full bg-gray-900 text-white text-xs font-medium px-4 py-2 rounded-full shadow-lg animate-pop-in whitespace-nowrap">
          🛒 장바구니에 담았어요!
        </div>
      )}

      {hasOptions && (
        <div className="mb-4">
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
      <p className="text-[11px] text-gray-400 mb-1">1인당 최대 {max}개까지 구매 가능해요</p>
      <p className="text-[11px] text-gray-400 mb-4">
        🚚 배송비 {SHIPPING_FEE.toLocaleString()}원 (주문 건당 별도 부과)
      </p>

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
  );
}
