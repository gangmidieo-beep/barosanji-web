"use client";

import { useState } from "react";
import { isImageUrl } from "@/lib/data";

export default function ProductGallery({
  images,
  badge,
  badgeClass,
}: {
  images: string[];
  badge?: string;
  badgeClass?: string;
}) {
  const [index, setIndex] = useState(0);
  const hasMultiple = images.length > 1;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== index) setIndex(i);
  };

  return (
    <div className="glow-image relative aspect-square bg-gradient-to-br from-brand-light via-emerald-50 to-lime-50 overflow-hidden">
      <div className="absolute -top-4 -left-4 w-28 h-28 rounded-full bg-brand/10 blur-2xl animate-blob z-0" />
      <div className="absolute bottom-0 right-0 w-24 h-24 rounded-full bg-accent/10 blur-2xl animate-blob z-0" style={{ animationDelay: "1.5s" }} />

      <div
        onScroll={hasMultiple ? handleScroll : undefined}
        className={`relative z-10 h-full flex items-center text-[8rem] ${
          hasMultiple ? "overflow-x-auto snap-x snap-mandatory scrollbar-none" : "justify-center overflow-hidden"
        }`}
      >
        {images.map((src, i) =>
          isImageUrl(src) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={src}
              alt=""
              className={`w-full h-full object-cover shrink-0 ${hasMultiple ? "snap-center" : ""}`}
            />
          ) : (
            <span
              key={i}
              className={`w-full h-full flex items-center justify-center shrink-0 animate-float drop-shadow-xl ${
                hasMultiple ? "snap-center" : ""
              }`}
            >
              {src}
            </span>
          )
        )}
      </div>

      {badge && (
        <span
          className={`absolute top-4 left-4 z-20 text-xs px-3 py-1 rounded-full font-semibold shadow-md ${badgeClass}`}
        >
          {badge}
        </span>
      )}
      <span className="absolute top-4 right-4 z-20 bg-white/90 backdrop-blur text-[11px] font-bold text-brand-dark px-2.5 py-1 rounded-full shadow-sm">
        🌱 산지직송
      </span>

      {hasMultiple && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
          {images.map((_, i) => (
            <span
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                i === index ? "bg-white w-4" : "bg-white/50"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
