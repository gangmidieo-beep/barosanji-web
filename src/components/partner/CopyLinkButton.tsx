"use client";
import { useState } from "react";

export default function CopyLinkButton({ text, label = "복사" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 1500);
    } catch {
      window.prompt("이 링크를 복사하세요", text);
    }
  };
  return (
    <button onClick={copy} className="block w-full mt-2.5 bg-[#ff7a1a] text-white font-black py-3.5 rounded-2xl active:scale-[0.98] transition">
      {done ? "✅ 복사됐어요!" : label}
    </button>
  );
}
