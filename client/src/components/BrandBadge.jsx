import React from "react";

// Shows the brand's real logo image when one is set in the catalog;
// otherwise falls back to a colored initials tile so the UI never breaks
// while you're still sourcing/uploading logo assets.
const BrandBadge = ({ name, color = "#3b7bf6", image = null, size = "md" }) => {
  const initials = (name || "?")
    .split(" ")
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (image) {
    return (
      <div className={`brand-badge brand-badge-${size} brand-badge-has-image`} style={{ background: color }}>
        <img src={image} alt={name} className="brand-badge-img" />
      </div>
    );
  }

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
