"use client";

import { useState } from "react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { categories, products as initialProducts, type Product } from "@/lib/data";
import { suppliers, getSupplierById } from "@/lib/suppliers";

function isImageUrl(image: string) {
  return image.startsWith("data:") || image.startsWith("http");
}

type FormState = {
  name: string;
  category: string;
  supplierId: string;
  farm: string;
  region: string;
  price: string;
  originalPrice: string;
  unit: string;
  badge: Product["badge"] | "";
  description: string;
  image: string; // emoji or uploaded data URL
};

const EMPTY_FORM: FormState = {
  name: "",
  category: categories[0].slug,
  supplierId: suppliers[0]?.id ?? "",
  farm: "",
  region: "",
  price: "",
  originalPrice: "",
  unit: "",
  badge: "",
  description: "",
  image: "🥬",
};

export default function ProductsAdminPage() {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [categoryFilter, setCategoryFilter] = useState<string>("전체");

  const filtered =
    categoryFilter === "전체" ? products : products.filter((p) => p.category === categoryFilter);

  const handleImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setForm((f) => ({ ...f, image: String(reader.result) }));
    };
    reader.readAsDataURL(file);
  };

  const resetAndClose = () => {
    setForm(EMPTY_FORM);
    setShowForm(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.price) return;
    const newProduct: Product = {
      id: `p-new-${Date.now()}`,
      name: form.name,
      category: form.category,
      farm: form.farm || "미입력",
      region: form.region || "미입력",
      price: Number(form.price),
      originalPrice: Number(form.originalPrice || form.price),
      unit: form.unit || "1개",
      badge: form.badge || undefined,
      rating: 5.0,
      reviewCount: 0,
      image: form.image,
      description: form.description,
      supplierId: form.supplierId,
    };
    setProducts((prev) => [newProduct, ...prev]);
    resetAndClose();
  };

  const removeProduct = (id: string) => {
    if (!confirm("이 상품을 목록에서 삭제할까요? (이 브라우저 세션에서만 반영됩니다)")) return;
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div>
      <AdminPageHeader
        title="상품 관리"
        description="상품을 등록할 때 어느 공급업체(어드민플러스 계정) 발주인지 지정합니다. 상품 이미지도 업로드할 수 있습니다."
        action={
          <button
            onClick={() => setShowForm(true)}
            className="bg-brand text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-brand-dark transition"
          >
            + 상품 등록
          </button>
        }
      />

      <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg px-4 py-3 mb-5">
        ⚠️ 데모 화면입니다 — 여기서 등록/수정/삭제한 내용은 이 브라우저 세션에서만 보이고, 실제
        쇼핑몰 화면(상품 목록)에는 반영되지 않습니다. 실제 서비스로 전환할 때는 이 화면이 진짜 상품
        DB를 읽고 쓰도록 연결해야 합니다.
      </div>

      <div className="flex gap-1.5 flex-wrap mb-4">
        {(["전체", ...categories.map((c) => c.slug)] as const).map((slug) => {
          const label = slug === "전체" ? "전체" : categories.find((c) => c.slug === slug)?.name;
          return (
            <button
              key={slug}
              onClick={() => setCategoryFilter(slug)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border ${
                categoryFilter === slug
                  ? "bg-brand text-white border-brand"
                  : "bg-white text-gray-600 border-gray-200"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="bg-white border border-gray-100 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 text-xs border-b border-gray-100">
              <th className="px-4 py-3 font-medium">이미지</th>
              <th className="px-4 py-3 font-medium">상품명</th>
              <th className="px-4 py-3 font-medium">카테고리</th>
              <th className="px-4 py-3 font-medium">공급업체</th>
              <th className="px-4 py-3 font-medium text-right">가격</th>
              <th className="px-4 py-3 font-medium">뱃지</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                <td className="px-4 py-3">
                  {isImageUrl(p.image) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image} alt={p.name} className="w-10 h-10 rounded-lg object-cover" />
                  ) : (
                    <span className="w-10 h-10 rounded-lg bg-brand-light flex items-center justify-center text-xl">
                      {p.image}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-800 font-medium max-w-[220px] truncate">{p.name}</td>
                <td className="px-4 py-3 text-gray-500">
                  {categories.find((c) => c.slug === p.category)?.name ?? p.category}
                </td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                  {getSupplierById(p.supplierId)?.name ?? "미지정"}
                </td>
                <td className="px-4 py-3 text-right font-medium text-gray-800 whitespace-nowrap">
                  {p.price.toLocaleString()}원
                </td>
                <td className="px-4 py-3 text-gray-500">{p.badge ?? "-"}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => removeProduct(p.id)}
                    className="text-xs text-red-500 hover:underline"
                  >
                    삭제
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6">
            <h2 className="font-bold text-lg mb-4">상품 등록</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">상품 이미지</label>
                <div className="flex items-center gap-3">
                  {isImageUrl(form.image) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={form.image} alt="미리보기" className="w-14 h-14 rounded-lg object-cover" />
                  ) : (
                    <span className="w-14 h-14 rounded-lg bg-brand-light flex items-center justify-center text-2xl">
                      {form.image}
                    </span>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
                    className="text-xs"
                  />
                </div>
              </div>

              <input
                required
                placeholder="상품명"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />

              <div className="grid grid-cols-2 gap-2">
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
                >
                  {categories
                    .filter((c) => c.slug !== "time-sale" && c.slug !== "direct" && c.slug !== "event")
                    .map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.name}
                      </option>
                    ))}
                </select>
                <select
                  value={form.supplierId}
                  onChange={(e) => setForm((f) => ({ ...f, supplierId: e.target.value }))}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  placeholder="산지/농가명"
                  value={form.farm}
                  onChange={(e) => setForm((f) => ({ ...f, farm: e.target.value }))}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
                <input
                  placeholder="지역"
                  value={form.region}
                  onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <input
                  required
                  type="number"
                  placeholder="판매가"
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
                <input
                  type="number"
                  placeholder="정가"
                  value={form.originalPrice}
                  onChange={(e) => setForm((f) => ({ ...f, originalPrice: e.target.value }))}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
                <input
                  placeholder="단위 (예: 5kg)"
                  value={form.unit}
                  onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <select
                value={form.badge}
                onChange={(e) => setForm((f) => ({ ...f, badge: e.target.value as FormState["badge"] }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">뱃지 없음</option>
                <option value="타임특가">타임특가</option>
                <option value="한정수량">한정수량</option>
                <option value="산지직송">산지직송</option>
                <option value="신상품">신상품</option>
              </select>

              <textarea
                placeholder="상품 설명"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={resetAndClose}
                  className="flex-1 border border-gray-200 rounded-full py-2.5 text-sm font-medium text-gray-600"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-brand text-white rounded-full py-2.5 text-sm font-semibold hover:bg-brand-dark transition"
                >
                  등록
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
