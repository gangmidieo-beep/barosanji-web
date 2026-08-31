"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { categories, isImageUrl, type Product } from "@/lib/data";
import { useSuppliers } from "@/lib/supplier-store";
import { DEFAULT_MAX_QTY_PER_PRODUCT } from "@/lib/site-config";

type ManagedProduct = Product & { visible: boolean; soldOut: boolean };

const MAX_THUMBNAILS = 10;

type FormState = {
  name: string;
  category: string;
  supplierId: string;
  supplierProductCode: string;
  farm: string;
  region: string;
  price: string;
  originalPrice: string;
  unit: string;
  badge: Product["badge"] | "";
  description: string;
  images: string[];
  detailImages: string[];
  maxQty: string;
  options: { label: string; price: string; code: string }[]; // 옵션별 발주코드 포함
};

const EDITABLE_CATEGORIES = categories.filter(
  (c) => c.slug !== "time-sale" && c.slug !== "direct"
);

const EMPTY_FORM: FormState = {
  name: "",
  category: EDITABLE_CATEGORIES[0].slug,
  supplierId: "",
  supplierProductCode: "",
  farm: "",
  region: "",
  price: "",
  originalPrice: "",
  unit: "",
  badge: "",
  description: "",
  images: [],
  detailImages: [],
  maxQty: "",
  options: [],
};

function toForm(p: ManagedProduct): FormState {
  return {
    name: p.name,
    category: p.category,
    supplierId: p.supplierId,
    supplierProductCode: p.supplierProductCode ?? "",
    farm: p.farm,
    region: p.region,
    price: String(p.price),
    originalPrice: String(p.originalPrice),
    unit: p.unit,
    badge: p.badge ?? "",
    description: p.description,
    images: p.images && p.images.length > 0 ? p.images : isImageUrl(p.image) ? [p.image] : [],
    detailImages: p.detailImages ?? [],
    maxQty: p.maxQty ? String(p.maxQty) : "",
    options: p.options ? p.options.map((o) => ({ label: o.label, price: String(o.price), code: o.code ?? "" })) : [],
  };
}

function toOptionsArray(
  options: { label: string; price: string; code: string }[]
): { label: string; price: number; code?: string }[] | undefined {
  const valid = options
    .filter((o) => o.label.trim() && o.price.trim())
    .map((o) => ({ label: o.label.trim(), price: Number(o.price), code: o.code.trim() || undefined }))
    .filter((o) => Number.isFinite(o.price) && o.price >= 0);
  return valid.length > 0 ? valid : undefined;
}

export default function ProductsAdminPage() {
  const { suppliers, getSupplierById } = useSuppliers();
  const [products, setProducts] = useState<ManagedProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    const res = await fetch("/api/admin/products");
    const data = await res.json();
    if (data.success) setProducts(data.products);
    setLoading(false);
  };

  useEffect(() => {
    reload();
  }, []);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [categoryFilter, setCategoryFilter] = useState<string>("전체");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkCategory, setBulkCategory] = useState<string>(EDITABLE_CATEGORIES[0].slug);
  const [bulkSupplier, setBulkSupplier] = useState<string>("");

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (categoryFilter !== "전체" && p.category !== categoryFilter) return false;
      if (query && !p.name.includes(query)) return false;
      return true;
    });
  }, [products, categoryFilter, query]);

  const groupedByCategory = useMemo(() => {
    return EDITABLE_CATEGORIES.map((c) => ({
      category: c,
      items: filtered.filter((p) => p.category === c.slug),
    })).filter((g) => g.items.length > 0);
  }, [filtered]);

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

  const bulkSetVisible = async (visible: boolean) => {
    const ids = Array.from(selected);
    setProducts((prev) => prev.map((p) => (selected.has(p.id) ? { ...p, visible } : p)));
    clearSelection();
    await fetch("/api/admin/products/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "setVisible", ids, visible }),
    });
  };

  const bulkMoveCategory = async () => {
    const ids = Array.from(selected);
    setProducts((prev) => prev.map((p) => (selected.has(p.id) ? { ...p, category: bulkCategory } : p)));
    clearSelection();
    await fetch("/api/admin/products/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "moveCategory", ids, category: bulkCategory }),
    });
  };
  const bulkMoveSupplier = async () => {
    if (!bulkSupplier) return;
    const ids = Array.from(selected);
    setProducts((prev) => prev.map((p) => (selected.has(p.id) ? { ...p, supplierId: bulkSupplier } : p)));
    clearSelection();
    await fetch("/api/admin/products/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "moveSupplier", ids, supplierId: bulkSupplier }),
    });
  };
  const bulkDelete = async () => {
    if (!confirm(`선택한 ${selected.size}개 상품을 삭제할까요? 실제로 삭제되며 되돌릴 수 없습니다.`)) return;
    const ids = Array.from(selected);
    setProducts((prev) => prev.filter((p) => !selected.has(p.id)));
    clearSelection();
    await fetch("/api/admin/products/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", ids }),
    });
  };

  const updatePrice = async (id: string, value: string) => {
    const price = Number(value.replace(/[^0-9]/g, ""));
    if (!Number.isFinite(price) || price < 0) return;
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, price } : p)));
    await fetch(`/api/admin/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ price }),
    });
  };

  const toggleOneVisible = async (id: string) => {
    const next = !products.find((p) => p.id === id)?.visible;
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, visible: next } : p)));
    await fetch(`/api/admin/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visible: next }),
    });
  };

  const toggleOneSoldOut = async (id: string) => {
    const next = !products.find((p) => p.id === id)?.soldOut;
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, soldOut: next } : p)));
    await fetch(`/api/admin/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ soldOut: next }),
    });
  };

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

  const dragThumbIndex = useRef<number | null>(null);
  const reorderThumbnail = (from: number, to: number) => {
    if (from === to) return;
    setForm((f) => {
      const imgs = [...f.images];
      const [moved] = imgs.splice(from, 1);
      imgs.splice(to, 0, moved);
      return { ...f, images: imgs };
    });
  };

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

  const addOptionRow = () => {
  setForm((f) => ({ ...f, options: [...f.options, { label: "", price: "", code: "" }] }));
  };
  const updateOptionRow = (index: number, field: "label" | "price" | "code", value: string) => {
    setForm((f) => ({
      ...f,
      options: f.options.map((o, i) => (i === index ? { ...o, [field]: value } : o)),
    }));
  };
  const removeOptionRow = (index: number) => {
    setForm((f) => ({ ...f, options: f.options.filter((_, i) => i !== index) }));
  };

  const resetAndClose = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
  };

  const openEdit = async (p: ManagedProduct) => {
    setForm(toForm(p));
    setEditingId(p.id);
    setShowForm(true);
    setEditLoading(true);
    try {
      const res = await fetch(`/api/admin/products/${p.id}`);
      const data = await res.json().catch(() => null);
      if (data?.success && data.product) {
        setForm(toForm(data.product));
      }
    } finally {
      setEditLoading(false);
    }
  };

  const openCreate = () => {
    setForm({ ...EMPTY_FORM, supplierId: suppliers[0]?.id ?? "" });
    setEditingId(null);
    setShowForm(true);
  };

  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  const duplicateProduct = async (p: ManagedProduct) => {
    setDuplicatingId(p.id);
    try {
      const detailRes = await fetch(`/api/admin/products/${p.id}`);
      const detailData = await detailRes.json().catch(() => null);
      const full: ManagedProduct = detailData?.success && detailData.product ? detailData.product : p;

      const payload = {
        name: full.name,
        category: full.category,
        farm: full.farm,
        region: full.region,
        price: full.price,
        originalPrice: full.originalPrice,
        unit: full.unit,
        badge: full.badge || undefined,
        description: full.description,
        images: full.images ?? [],
        detailImages: full.detailImages ?? [],
        supplierId: full.supplierId,
        supplierProductCode: full.supplierProductCode,
        maxQty: full.maxQty,
        options: full.options,
      };

      const createRes = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const createData = await createRes.json().catch(() => null);
      await reload();
      if (createData?.success && createData.product) {
        setForm(toForm(createData.product));
        setEditingId(createData.product.id);
        setShowForm(true);
      }
    } finally {
      setDuplicatingId(null);
    }
  };

  const [submitting, setSubmitting] = useState(false);
  const [editLoading, setEditLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.price) return;
    setSubmitting(true);

    const payload = {
      name: form.name,
      category: form.category,
      farm: form.farm || "미입력",
      region: form.region || "미입력",
      price: Number(form.price),
      originalPrice: Number(form.originalPrice || form.price),
      unit: form.unit || "1개",
      badge: form.badge || undefined,
      description: form.description,
      images: form.images,
      detailImages: form.detailImages,
      supplierId: form.supplierId,
      supplierProductCode: form.supplierProductCode || undefined,
      maxQty: form.maxQty ? Number(form.maxQty) : undefined,
      options: toOptionsArray(form.options),
    };

    if (editingId) {
      await fetch(`/api/admin/products/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    await reload();
    setSubmitting(false);
    resetAndClose();
  };

  const removeProduct = async (id: string) => {
    if (!confirm("이 상품을 삭제할까요? 실제로 삭제되며 되돌릴 수 없습니다.")) return;
    setProducts((prev) => prev.filter((p) => p.id !== id));
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
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

      <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg px-4 py-3 mb-5">
        ✅ 실제 데이터베이스에 연결된 화면입니다 — 여기서 등록/수정/삭제/노출 변경하면 실제 쇼핑몰 화면에
        바로 반영됩니다.
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
                    <select
            value={bulkSupplier}
            onChange={(e) => setBulkSupplier(e.target.value)}
            className="ml-2 bg-gray-800 text-white rounded px-2 py-1.5 text-xs border border-gray-700"
          >
            <option value="">거래처 선택</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <button
            onClick={bulkMoveSupplier}
            disabled={!bulkSupplier}
            className="bg-gray-700 hover:bg-gray-600 rounded px-3 py-1.5 font-medium disabled:opacity-50"
          >
            거래처 변경
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
        <table className="text-sm table-fixed">
          <colgroup>
            <col className="w-8" />
            <col className="w-12" />
            <col className="w-14" />
            <col className="w-56" />
            <col className="w-20" />
            <col className="w-24" />
            <col className="w-28" />
            <col className="w-16" />
            <col className="w-16" />
            <col className="w-36" />
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
              <th className="px-2 py-2.5 font-medium">품절</th>
              <th className="px-2 py-2.5 font-medium">관리</th>
            </tr>
          </thead>
          <tbody>
            {groupedByCategory.map((group) => (
              <Fragment key={group.category.slug}>
                <tr>
                  <td colSpan={10} className="bg-brand-light/40 px-2 py-1.5 text-xs font-bold text-brand-dark">
                    {group.category.icon} {group.category.name} ({group.items.length})
                  </td>
                </tr>
                {group.items.map((p) => (
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
                    <td className="px-2 py-2">
                      <button
                        onClick={() => toggleOneSoldOut(p.id)}
                        className={`text-xs font-semibold px-2 py-1 rounded-full ${
                          p.soldOut ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-400"
                        }`}
                      >
                        {p.soldOut ? "품절" : "판매중"}
                      </button>
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      <button onClick={() => openEdit(p)} className="text-xs text-brand-dark font-medium mr-2">
                        수정
                      </button>
                      <button
                        onClick={() => duplicateProduct(p)}
                        disabled={duplicatingId === p.id}
                        className="text-xs text-gray-500 font-medium mr-2 hover:text-brand-dark disabled:opacity-50"
                      >
                        {duplicatingId === p.id ? "복사 중..." : "복사"}
                      </button>
                      <button onClick={() => removeProduct(p.id)} className="text-xs text-red-500 hover:underline">
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </Fragment>
            ))}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-10 text-center text-gray-400">
                  조건에 맞는 상품이 없습니다.
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td colSpan={10} className="px-4 py-10 text-center text-gray-400">
                  불러오는 중...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto p-6 sm:p-8">
            <h2 className="font-bold text-lg mb-4">{editingId ? "상품 수정" : "상품 등록"}</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  상품 썸네일 ({form.images.length}/{MAX_THUMBNAILS}장 · 첫 장이 대표 이미지)
                </label>
                {form.images.length > 0 && (
                  <div className="flex flex-wrap gap-2.5 mb-2">
                    {form.images.map((src, i) => (
                      <div
                        key={i}
                        draggable
                        onDragStart={() => {
                          dragThumbIndex.current = i;
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (dragThumbIndex.current !== null) {
                            reorderThumbnail(dragThumbIndex.current, i);
                            dragThumbIndex.current = null;
                          }
                        }}
                        onDragEnd={() => {
                          dragThumbIndex.current = null;
                        }}
                        className="relative cursor-move"
                        title="드래그해서 순서 변경 (맨 앞 = 대표 이미지)"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={src}
                          alt={`썸네일 ${i + 1}`}
                          className="w-20 h-20 rounded-lg object-cover border border-gray-200 pointer-events-none"
                        />
                        {i === 0 && (
                          <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-white bg-brand px-1.5 py-0.5 rounded-full">
                            대표
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => removeThumbnail(i)}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gray-800 text-white text-[11px] leading-none flex items-center justify-center"
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
                  사진을 드래그해서 순서를 바꾸면 맨 앞 사진이 대표 이미지가 돼요.
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
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">카테고리</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  >
                    {EDITABLE_CATEGORIES.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">공급업체 (발주처)</label>
                  <select
                    value={form.supplierId}
                    onChange={(e) => setForm((f) => ({ ...f, supplierId: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 발주코드는 엑셀로 발주하는 업체(식품백억)에만 필요. 어드민플러스 API 업체는 자동 발주라 불필요 */}
              {form.supplierId === "supplier-food100" && (
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">식품백억 상품 옵션코드</label>
                  <input
                    placeholder="예: stra_sb_1k"
                    value={form.supplierProductCode}
                    onChange={(e) => setForm((f) => ({ ...f, supplierProductCode: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    주문 관리에서 엑셀 대량발주 파일 만들 때 이 코드가 "상품 옵션코드" 칸에 그대로 들어가요.
                    비워두면 그 칸이 빈 채로 나가니, 발주 전에 꼭 채워주세요.
                  </p>
                </div>
              )}

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

              <div>
                <input
                  type="number"
                  min={1}
                  placeholder={`1인당 최대 구매 수량 (비우면 기본 ${DEFAULT_MAX_QTY_PER_PRODUCT}개)`}
                  value={form.maxQty}
                  onChange={(e) => setForm((f) => ({ ...f, maxQty: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  한 품목을 대량으로 담기보다 여러 품목을 나눠 구매하도록 유도하는 수량 제한이에요.
                </p>
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  옵션 설정 (선택 — 예: 1kg, 2kg, 3kg, 5kg마다 다른 가격)
                </label>
                {form.options.length > 0 && (
                  <div className="space-y-2 mb-2">
                    {form.options.map((opt, i) => (
                      <div key={i} className="flex gap-2">
                        <input
                          placeholder="옵션명 (예: 1kg)"
                          value={opt.label}
                          onChange={(e) => updateOptionRow(i, "label", e.target.value)}
                          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                        />
                        <input
                          type="number"
                          placeholder="가격"
                          value={opt.price}
                          onChange={(e) => updateOptionRow(i, "price", e.target.value)}
                          className="w-28 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                        />
                                                <input
                          placeholder="발주코드"
                          value={opt.code}
                          onChange={(e) => updateOptionRow(i, "code", e.target.value)}
                          className="w-32 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => removeOptionRow(i)}
                          className="w-9 h-9 shrink-0 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={addOptionRow}
                  className="text-xs font-medium text-brand-dark border border-dashed border-brand/50 rounded-lg px-3 py-2 hover:bg-brand-light/40"
                >
                  + 옵션 추가
                </button>
                <p className="text-[11px] text-gray-400 mt-1">
                  옵션을 하나 이상 등록하면 상세페이지에서 고객이 옵션을 골라 담을 수 있어요. 옵션의 가격이 위
                  판매가 대신 사용됩니다. 비워두면 기존처럼 판매가 하나만 쓰여요.
                </p>
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
                  disabled={submitting || editLoading}
                  className="flex-1 bg-brand text-white rounded-full py-2.5 text-sm font-semibold hover:bg-brand-dark transition disabled:opacity-60"
                >
                  {submitting ? "저장 중..." : editLoading ? "불러오는 중..." : editingId ? "저장" : "등록"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
