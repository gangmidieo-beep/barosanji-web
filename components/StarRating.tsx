export default function StarRating({
  rating,
  size = "sm",
}: {
  rating: number;
  size?: "sm" | "md";
}) {
  const full = Math.floor(rating);
  const hasHalf = rating - full >= 0.5;
  const starSize = size === "md" ? "text-base" : "text-xs";

  return (
    <span className={`inline-flex items-center gap-0.5 ${starSize}`}>
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = i < full || (i === full && hasHalf);
        return (
          <span key={i} className={filled ? "text-amber-400" : "text-gray-200"}>
            ★
          </span>
        );
      })}
    </span>
  );
}
