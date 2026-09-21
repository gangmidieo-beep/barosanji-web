import type { Product } from "@/lib/data";

/**
 * 상세 이미지가 없는 상품용 "상세정보" 화면.
 * 공급사가 상세컷을 주지 않는 상품이 많아서, 상품 데이터(설명·원산지·옵션)만으로
 * 읽기 좋은 상세 안내를 자동으로 그려준다. 상세 이미지를 직접 올린 상품은 이걸 쓰지 않는다.
 */

type Section = { title: string | null; lines: string[] };

function parseSections(text: string): Section[] {
  const sections: Section[] = [];
  let cur: Section = { title: null, lines: [] };
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const heading = /^\[(.+)\]$/.exec(line);
    if (heading) {
      if (cur.title || cur.lines.length > 0) sections.push(cur);
      cur = { title: heading[1], lines: [] };
    } else {
      cur.lines.push(line.replace(/^[✔·]\s*/, ""));
    }
  }
  if (cur.title || cur.lines.length > 0) sections.push(cur);
  return sections;
}

export default function ProductDetailInfo({ product }: { product: Product }) {
  const sections = parseSections(product.description || "");
  const intro = sections.find((s) => !s.title);
  const rest = sections.filter((s) => s.title);
  const options = product.options ?? [];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-br from-brand-light to-white border border-brand-light px-5 py-6 text-center">
        <p className="text-xs font-semibold text-brand-dark tracking-wide">산지에서 바로 보내드려요</p>
        <h3 className="text-xl font-extrabold text-gray-900 mt-1.5 leading-snug">{product.name}</h3>
        {product.region && (
          <p className="text-sm text-gray-600 mt-1.5">원산지 · {product.region}</p>
        )}
      </div>

      {intro && intro.lines.length > 0 && (
        <ul className="grid gap-2">
          {intro.lines.map((line, i) => (
            <li
              key={i}
              className="flex gap-2.5 items-start bg-white border border-gray-100 rounded-xl px-4 py-3 text-sm text-gray-700"
            >
              <span className="text-brand font-bold shrink-0">✓</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      )}

      {options.length > 1 && (
        <div>
          <h4 className="font-bold text-gray-900 mb-2">옵션별 가격</h4>
          <div className="border border-gray-100 rounded-xl overflow-hidden text-sm">
            {options.map((o, i) => (
              <div
                key={i}
                className={`flex justify-between gap-3 px-4 py-2.5 ${i % 2 ? "bg-gray-50" : "bg-white"}`}
              >
                <span className="text-gray-700">{o.label}</span>
                <span className="font-semibold text-gray-900 shrink-0">
                  {o.price.toLocaleString()}원
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {rest.map((s, i) => (
        <div key={i}>
          <h4 className="font-bold text-gray-900 mb-2">{s.title}</h4>
          <ul className="bg-gray-50 rounded-xl px-4 py-3 space-y-1.5 text-sm text-gray-600">
            {s.lines.map((line, j) => (
              <li key={j}>· {line}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
