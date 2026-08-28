"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Product } from "@/lib/data";
import { useCart } from "@/lib/cart-context";

export default function ProductActions({ product }: { product: Product }) {
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const { addItem } = useCart();
  const router = useRouter();

  const handleAdd = () => {
    addItem(product, qty);
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
      <div className="flex items-center gap-3 mb-4">
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
            onClick={() => setQty((q) => q + 1)}
            className="w-8 h-8 text-gray-500 hover:text-brand-dark active:scale-90 transition-transform"
          >
            +
          </button>
        </div>
        <span className="text-sm text-gray-500 ml-auto">
          합계 <b className="text-gray-900">{(product.price * qty).toLocaleString()}원</b>
        </span>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleAdd}
          className="flex-1 border-2 border-brand text-brand-dark font-semibold py-3 rounded-full hover:bg-brand-light active:scale-[0.97] transition"
        >
          장바구니 담기
        </button>
        <button
          onClick={() => {
            addItem(product, qty);
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
