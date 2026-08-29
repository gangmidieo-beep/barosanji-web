"use client";

import { useEffect, useMemo, useState } from "react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { categories, products as initialProducts, isImageUrl, type Product } from "@/lib/data";
import { suppliers, getSupplierById } from "@/lib/suppliers";

type ManagedProduct = Product & { visible: boolean };

const MAX_THUMBNAILS = 10;

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
  images: string[]; // 썸네일 갤러리 (최대 10장, 첫 장이 대표 이미지)
  detailImages: string[]; // 상세페이지용 이미지 목록 (png/jpg/gif 등, gif 애니메이션 지원)
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
  images: [],
  detailImages: [],
};

const EDITABLE_CATEGORIES = categories.filter(
  (c) => c.slug !== "time-sale" && c.slug !== "direct" && c.slug !== "event"
);

// 새로고침해도 등록/수정/삭제 내용이 유지되도록 이 브라우저에 저장해둡니다.
// (실제 서비스 전환 시에는 이 부분을 DB 연동으로 교체하면 됩니다)
const STORAGE_KEY = "barosanji-admin-products";

function loadStoredProducts(): ManagedProduct[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as ManagedProduct[];
    return null;
  } catch {
    return null;
  }
}

function toForm(p: ManagedProduct): FormState {
  return {
    name: p.name,
    category: p.category,
    supplierId: p.supplierId,
    farm: p.farm,
    region: p.region,
    price: String(p.price),
    originalPrice: String(p.originalPrice),
    unit: p.unit,
    badge: p.badge ?? "",
    description: p.description,
    images: p.images && p.images.length > 0 ? p.images : isImageUrl(p.image) ? [p.image] : [],
    detailImages: p.detailImages ?? [],
  };
}

export default function ProductsAdminPage() {
  const [products, setProducts] = useState<ManagedProduct[]>(
    () => loadStoredProducts() ?? initialProducts.map((p) => ({ ...p, visible: true }))
  );

  // 상품 목록이 바뀔 때마다 이 브라우저에 저장 (새로고침해도 등록/수정/삭제가 유지됨)
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    } catch {
      // 저장 공간이 꽉 찼거나 브라우저가 막아둔 경우 등 — 무시하고 화면 상태는 그대로 유지
    }
  }, [products]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [categoryFilter, setCategoryFilter] = useState<string>("전체");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkCategory, setBulkCategory] = useState<string>(EDITABLE_CATEGORIES[0].slug);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (categoryFilter !== "전체" && p.category !== categoryFilter) return false;
      if (query && !p.name.includes(query)) return false;
      return true;
    });
  }, [products, categoryFilter, query]);

  const allFilteredSelected = filtered.length > 0 && filtered.every((p) => selected.has(p.id));

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllFiltered = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filtered.forEach((p) => next.delete(p.id));
      } else {
        filtered.forEach((p) => next.add(p.id));
      }
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());

  const bulkSetVisible = (visible: boolean) => {
    setProducts((prev) => prev.map((p) => (selected.has(p.id) ? { ...p, visible } : p)));
    clearSelection();
  };

  const bulkMoveCategory = () => {
    setProducts((prev) => prev.map((p) => (selected.has(p.id) ? { ...p, category: bulkCategory } : p)));
    clearSelection();
  };

  const bulkDelete = () => {
    if (!confirm(`선택한 ${selected.size}개 상품을 삭제할까요? (이 브라우저 세션에서만 반영됩니다)`)) return;
    setProducts((prev) => prev.filter((p) => !selected.has(p.id)));
    clearSelection();
  };

  const updatePrice = (id: string, value: string) => {
    const price = Number(value.replace(/[^0-9]/g, ""));
    if (!Number.isFinite(price) || price < 0) return;
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, price } : p)));
  };

  const toggleOneVisible = (id: string) => {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, visible: !p.visible } : p)));
  };

  // 상품 썸네일 여러 장 업로드 (최대 10장, 첫 장이 목록/카드 대표 이미지로 쓰임)
  const handleThumbnailsUpload = (files: FileList) => {
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setForm((f) =>
          f.images.length >= MAX_THUMBNAILS
            ? f
            : { ...f, images: [...f.images, String(reader.result)] }
        );
      };
      reader.readAsDataURL(file);
    });
  };

  const removeThumbnail = (index: number) => {
    setForm((f) => ({ ...f, images: f.images.filter((_, i) => i !== index) }));
  };

  // 상세페이지용 이미지 여러 장 업로드 — png/jpg는 물론 gif(움짤)도 그대로 지원 (최대 10장)
  const handleDetailImagesUpload = (files: FileList) => {
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setForm((f) =>
          f.detailImages.length >= MAX_THUMBNAILS
            ? f
            : { ...f, detailImages: [...f.detailImages, String(reader.result)] }
        );
      };
      reader.readAsDataURL(file);
    });
  };

  const removeDetailImage = (index: number) => {
    setForm((f) => ({ ...f, detailImages: f.detailImages.filter((_, i) => i !== index) }));
  };

  const resetAndClose = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
  };

  const openEdit = (p: ManagedProduct) => {
    setForm(toForm(p));
    setEditingId(p.id);
    setShowForm(true);
  };

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.price) return;

    if (editingId) {
      setProducts((prev) =>
        prev.map((p) =>
          p.id === editingId
            ? {
                ...p,
                name: form.name,
                category: form.category,
                farm: form.farm || "미입력",
                region: form.region || "미입력",
                price: Number(form.price),
                originalPrice: Number(form.originalPrice || form.price),
                unit: form.unit || "1개",
                badge: form.badge || undefined,
                image: form.images[0] ?? "🥬",
                images: form.images,
                detailImages: form.detailImages,
                description: form.description,
                supplierId: form.supplierId,
              }
            : p
        )
      );
    } else {
      const newProduct: ManagedProduct = {
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
        image: form.images[0] ?? "🥬",
        images: form.images,
        detailImages: form.detailImages,
        description: form.description,
        supplierId: form.supplierId,
        visible: true,
      };
      setProducts((prev) => [newProduct, ...prev]);
    }
    resetAndClose();
  };

  const removeProduct = (id: string) => {
    if (!confirm("이 상품을 목록에서 삭제할까요? (이 브라우저 세션에서만 반영됩니다)")) return;
    setProducts((prev) => prev.filter((p) => p.id !== id));
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  return (
    <div>
      <AdminPageHeader
        title={`상품 관리 (${filtered.length})`}
        description="상품을 등록할 때 어느 공급업체(어드민플러스 계정) 발주인지 지정합니다. 상품 이미지도 업로드할 수 있습니다."
        action={
          <button
            onClick={openCreate}
            className="bg-brand text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-brand-dark transition"
          >
            + 상품 등록
          </button>
        }
      />

      <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg px-4 py-3 mb-5 flex items-center justify-between gap-3">
        <span>
          ⚠️ 데모 화면입니다 — 여기서 등록/수정/삭제/노출 변경한 내용은 이 브라우저에 저장되어 새로고침해도
          유지되지만, 다른 사람 화면이나 실제 쇼핑몰 화면(상품 목록)에는 반영되지 않습니다. 실제 서비스로
          전환할 때는 이 화면이 진짜 상품 DB를 읽고 쓰도록 연결해야 합니다.
        </span>
        <button
          onClick={() => {
            if (!confirm("이 브라우저에 저장된 상품 변경 내용을 모두 지우고 기본 상품 목록으로 되돌릴까요?")) return;
            localStorage.removeItem(STORAGE_KEY);
            setProducts(initialProducts.map((p) => ({ ...p, visible: true })));
          }}
          className="shrink-0 text-amber-800 underline underline-offset-2 whitespace-nowrap"
        >
          기본값으로 초기화
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex gap-1.5 flex-wrap">
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
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="상품명 검색"
          className="ml-auto border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-52"
        />
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 bg-gray-900 text-white text-xs rounded-lg px-4 py-2.5 mb-3">
          <span className="font-semibold">{selected.size}개 선택됨</span>
          <select
            value={bulkCategory}
            onChange={(e) => setBulkCategory(e.target.value)}
            className="ml-2 bg-gray-800 text-white rounded px-2 py-1.5 text-xs border border-gray-700"
          >
            {EDITABLE_CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
          <button onClick={bulkMoveCategory} className="bg-gray-700 hover:bg-gray-600 rounded px-3 py-1.5 font-medium">
            카테고리 옮기기
          </button>
          <button onClick={() => bulkSetVisible(true)} className="bg-gray-700 hover:bg-gray-600 rounded px-3 py-1.5 font-medium">
            노출로 변경
          </button>
          <button onClick={() => bulkSetVisible(false)} className="bg-gray-700 hover:bg-gray-600 rounded px-3 py-1.5 font-medium">
            숨김으로 변경
          </button>
          <button onClick={bulkDelete} className="bg-red-600 hover:bg-red-500 rounded px-3 py-1.5 font-semibold ml-auto">
            선택 삭제
          </button>
          <button onClick={clearSelection} className="text-gray-300 hover:text-white px-2">
            취소
          </button>
        </div>
      )}

      <div className="bg-white border border-gray-100 rounded-xl overflow-x-auto">
        <table className="w-full text-sm table-fixed">
          <colgroup>
            <col className="w-8" />
            <col className="w-12" />
            <col className="w-14" />
            <col className="w-auto" />
            <col className="w-20" />
            <col className="w-24" />
            <col className="w-28" />
            <col className="w-16" />
            <col className="w-20" />
          </colgroup>
          <thead>
            <tr className="text-left text-gray-400 text-xs border-b border-gray-100">
              <th className="px-2 py-2.5 font-medium">
                <input
                  type="checkbox"
                  checked={allFilteredSelected}
                  onChange={toggleAllFiltered}
                  className="w-4 h-4 accent-brand"
                />
              </th>
              <th className="px-2 py-2.5 font-medium">ID</th>
              <th className="px-2 py-2.5 font-medium">이미지</th>
              <th className="px-2 py-2.5 font-medium">상품명</th>
              <th className="px-2 py-2.5 font-medium">카테고리</th>
              <th className="px-2 py-2.5 font-medium">공급업체</th>
              <th className="px-2 py-2.5 font-medium text-right">가격</th>
              <th className="px-2 py-2.5 font-medium">노출</th>
              <th className="px-2 py-2.5 font-medium">관리</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                <td className="px-2 py-2">
                  <input
                    type="checkbox"
                    checked={selected.has(p.id)}
                    onChange={() => toggleOne(p.id)}
                    className="w-4 h-4 accent-brand"
                  />
                </td>
                <td className="px-2 py-2 text-gray-400 text-xs truncate">{p.id}</td>
                <td className="px-2 py-2">
                  {(() => {
                    const thumb = p.images?.[0] ?? p.image;
                    return isImageUrl(thumb) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumb} alt={p.name} className="w-9 h-9 rounded-lg object-cover" />
                    ) : (
                      <span className="w-9 h-9 rounded-lg bg-brand-light flex items-center justify-center text-lg">
                        {thumb}
                      </span>
                    );
                  })()}
                </td>
                <td className="px-2 py-2 text-gray-800 font-medium truncate">{p.name}</td>
                <td className="px-2 py-2 text-gray-500 truncate">
                  {categories.find((c) => c.slug === p.category)?.name ?? p.category}
                </td>
                <td className="px-2 py-2 text-gray-500 truncate">
                  {getSupplierById(p.supplierId)?.name ?? "미지정"}
                </td>
                <td className="px-2 py-2">
                  <div className="flex items-center justify-end gap-0.5">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={p.price.toLocaleString()}
                      onChange={(e) => updatePrice(p.id, e.target.value)}
                      className="w-full min-w-0 text-right font-medium text-gray-800 border border-transparent hover:border-gray-200 focus:border-brand rounded px-1.5 py-1 outline-none"
                    />
                    <span className="text-gray-400 text-xs shrink-0">원</span>
                  </div>
                </td>
                <td className="px-2 py-2">
                  <button
                    onClick={() => toggleOneVisible(p.id)}
                    className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      p.visible ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {p.visible ? "노출" : "숨김"}
                  </button>
                </td>
                <td className="px-2 py-2 whitespace-nowrap">
                  <button onClick={() => openEdit(p)} className="text-xs text-brand-dark font-medium mr-2">
                    수정
                  </button>
                  <button onClick={() => removeProduct(p.id)} className="text-xs text-red-500 hover:underline">
                    삭제
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-gray-400">
                  조건에 맞는 상품이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6">
            <h2 className="font-bold text-lg mb-4">{editingId ? "상품 수정" : "상품 등록"}</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  상품 썸네일 ({form.images.length}/{MAX_THUMBNAILS}장 · 첫 장이 대표 이미지)
                </label>
                {form.images.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {form.images.map((src, i) => (
                      <div key={i} className="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt={`썸네일 ${i + 1}`} className="w-14 h-14 rounded-lg object-cover border border-gray-200" />
                        {i === 0 && (
                          <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-white bg-brand px-1.5 py-0.5 rounded-full">
                            대표
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => removeThumbnail(i)}
                          className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 rounded-full bg-gray-800 text-white text-[10px] leading-none flex items-center justify-center"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {form.images.length < MAX_THUMBNAILS ? (
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => e.target.files && e.target.files.length > 0 && handleThumbnailsUpload(e.target.files)}
                    className="text-xs"
                  />
                ) : (
                  <p className="text-[11px] text-gray-400">최대 10장까지 등록할 수 있어요.</p>
                )}
                <p className="text-[11px] text-gray-400 mt-1">
                  등록 안 하면 기본 아이콘(🥬)으로 표시됩니다. 여러 장 올리면 상세페이지 상단에서 좌우로 넘겨볼 수 있어요.
                </p>
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  상세페이지 이미지 ({form.detailImages.length}/{MAX_THUMBNAILS}장 · GIF 움짤 가능)
                </label>
                {form.detailImages.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {form.detailImages.map((src, i) => (
                      <div key={i} className="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt={`상세 이미지 ${i + 1}`} className="w-14 h-14 rounded-lg object-cover border border-gray-200" />
                        <button
                          type="button"
                          onClick={() => removeDetailImage(i)}
                          className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 rounded-full bg-gray-800 text-white text-[10px] leading-none flex items-center justify-center"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {form.detailImages.length < MAX_THUMBNAILS ? (
                  <input
                    type="file"
                    accept="image/*,.gif"
                    multiple
                    onChange={(e) => e.target.files && e.target.files.length > 0 && handleDetailImagesUpload(e.target.files)}
                    className="text-xs"
                  />
                ) : (
                  <p className="text-[11px] text-gray-400">최대 10장까지 등록할 수 있어요.</p>
                )}
                <p className="text-[11px] text-gray-400 mt-1">
                  등록한 순서대로 상품설명 하단 "상세정보"에 세로로 보여집니다. GIF 파일도 애니메이션 그대로 재생됩니다.
                </p>
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
                  {EDITABLE_CATEGORIES.map((c) => (
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
                  {editingId ? "저장" : "등록"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
