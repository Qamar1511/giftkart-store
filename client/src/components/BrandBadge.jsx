import React from "react";

// We don't ship official brand logo images (trademark/licensing reasons) —
// this renders a consistent colored initials tile instead. Swap this out
// for real <img> logos later if/when you have licensed brand assets.
const BrandBadge = ({ name, color = "#3b7bf6", size = "md" }) => {
  const initials = (name || "?")
    .split(" ")
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div
      className={`brand-badge brand-badge-${size}`}
      style={{ background: `linear-gradient(135deg, ${color}, ${color}99)` }}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
};

export default BrandBadge;
