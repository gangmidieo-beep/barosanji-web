"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import { getMaxQty } from "@/lib/data";
import { SHIPPING_FEE } from "@/lib/site-config";

export default function CartPage() {
  const { items, removeItem, updateQuantity, totalPrice, totalCount } = useCart();

  const shipping = items.length > 0 ? SHIPPING_FEE : 0;

  return (
    <div className="px-4 py-6">
      <h1 className="text-xl font-bold mb-5">장바구니 ({totalCount})</h1>

      {items.length === 0 ? (
        <div className="text-center py-24 text-gray-400">
          <p className="text-5xl mb-4">🛒</p>
          <p>장바구니가 비어있습니다.</p>
          <Link
            href="/"
            className="inline-block mt-4 bg-brand text-white px-5 py-2.5 rounded-full font-semibold hover:bg-brand-dark"
          >
            상품 보러가기
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="space-y-3">
            {items.map(({ product, quantity }) => {
              const max = getMaxQty(product);
              return (
                <div
                  key={product.id}
                  className="flex items-center gap-4 border border-gray-100 rounded-xl p-3"
                >
                  <Link
                    href={`/product/${product.id}`}
                    className="w-20 h-20 shrink-0 bg-brand-light rounded-lg flex items-center justify-center text-3xl"
                  >
                    {product.image}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-brand-dark font-medium">
                      {product.region} · {product.farm}
                    </p>
                    <Link href={`/product/${product.id}`} className="text-sm font-medium truncate block hover:underline">
                      {product.name}
                    </Link>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex items-center border border-gray-200 rounded-full">
                        <button
                          onClick={() => updateQuantity(product.id, quantity - 1)}
                          className="w-7 h-7 text-gray-500"
                        >
                          -
                        </button>
                        <span className="w-6 text-center text-xs">{quantity}</span>
                        <button
                          onClick={() => updateQuantity(product.id, quantity + 1)}
                          disabled={quantity >= max}
                          className="w-7 h-7 text-gray-500 disabled:text-gray-200"
                        >
                          +
                        </button>
                      </div>
                      <button
                        onClick={() => removeItem(product.id)}
                        className="text-xs text-gray-400 hover:text-red-500 ml-2"
                      >
                        삭제
                      </button>
                    </div>
                    {quantity >= max && (
                      <p className="text-[10px] text-gray-400 mt-1">
                        1인당 최대 {max}개까지 구매 가능해요
                      </p>
                    )}
                  </div>
                  <p className="font-bold text-sm shrink-0">
                    {(product.price * quantity).toLocaleString()}원
                  </p>
                </div>
              );
            })}
          </div>

          <div className="border border-gray-100 rounded-xl p-5 h-fit">
            <h2 className="font-bold mb-4">결제 예상 금액</h2>
            <div className="text-sm space-y-2 text-gray-600">
              <div className="flex justify-between">
                <span>상품금액</span>
                <span>{totalPrice.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between">
                <span>배송비</span>
                <span className="font-medium">{shipping.toLocaleString()}원</span>
              </div>
            </div>
            <div className="border-t border-gray-100 mt-3 pt-3 flex justify-between font-bold text-gray-900">
              <span>총 결제금액</span>
              <span>{(totalPrice + shipping).toLocaleString()}원</span>
            </div>
            <Link
              href="/checkout"
              className="block text-center mt-5 bg-brand text-white font-semibold py-3 rounded-full hover:bg-brand-dark transition"
            >
              주문하기
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
