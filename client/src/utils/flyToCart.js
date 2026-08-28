// Flies a shrinking "clone" of a product's image from where it sits up and into
// the navbar cart icon, then gives the cart a little bump. Purely cosmetic —
// safe to no-op if anything's missing or the user prefers reduced motion.
//
// Uses the Web Animations API (element.animate) so there are no extra deps and
// the clone always cleans itself up on finish/cancel.

export default function flyToCart(sourceEl, { imageSrc, color, label } = {}) {
  if (!sourceEl || typeof document === "undefined") return;

  const reduce =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const cart = document.querySelector(".navbar-cart-link");
  if (!cart || reduce) return;

  const s = sourceEl.getBoundingClientRect();
  const c = cart.getBoundingClientRect();
  if (!s.width || !c.width) return;

  const size = Math.min(s.width, s.height, 130);
  const startLeft = s.left + s.width / 2 - size / 2;
  const startTop = s.top + s.height / 2 - size / 2;

  const fly = document.createElement("div");
  fly.setAttribute("aria-hidden", "true");
  Object.assign(fly.style, {
    position: "fixed",
    left: `${startLeft}px`,
    top: `${startTop}px`,
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: "16px",
    zIndex: "6000",
    pointerEvents: "none",
    overflow: "hidden",
    boxShadow: "0 16px 34px rgba(15, 23, 42, 0.32)",
    willChange: "transform, opacity",
  });

  if (imageSrc) {
    const img = document.createElement("img");
    img.src = imageSrc;
    Object.assign(img.style, {
      width: "100%",
      height: "100%",
      objectFit: "cover",
      display: "block",
    });
    fly.appendChild(img);
  } else {
    // No product image → mimic the colored BrandBadge with initials.
    Object.assign(fly.style, {
      background: `linear-gradient(135deg, ${color || "#2f6fed"}, #7c4fe0)`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#fff",
      fontWeight: "800",
      fontFamily: "'Rajdhani', 'Inter', sans-serif",
      fontSize: `${size * 0.34}px`,
      letterSpacing: "0.02em",
    });
    fly.textContent = (label || "GC").trim().slice(0, 2).toUpperCase();
  }

  document.body.appendChild(fly);

  const dx = c.left + c.width / 2 - (s.left + s.width / 2);
  const dy = c.top + c.height / 2 - (s.top + s.height / 2);

  const anim = fly.animate(
    [
      { transform: "translate(0,0) scale(1) rotate(0deg)", opacity: 1, offset: 0 },
      // pop up + start wrapping (shrink & tilt)
      {
        transform: `translate(${dx * 0.3}px, ${dy * 0.15 - 46}px) scale(0.78) rotate(-10deg)`,
        opacity: 1,
        offset: 0.4,
      },
      // dive into the cart, shrink to nearly a point
      {
        transform: `translate(${dx}px, ${dy}px) scale(0.1) rotate(22deg)`,
        opacity: 0.2,
        offset: 1,
      },
    ],
    { duration: 900, easing: "cubic-bezier(.5,-0.06,.3,1)", fill: "forwards" }
  );

  const cleanup = () => {
    fly.remove();
    // little bump on the cart when the item "lands"
    if (cart.animate) {
      cart.animate(
        [
          { transform: "scale(1)" },
          { transform: "scale(1.35)" },
          { transform: "scale(0.92)" },
          { transform: "scale(1)" },
        ],
        { duration: 420, easing: "ease-out" }
      );
    }
  };

  anim.onfinish = cleanup;
  anim.oncancel = () => fly.remove();
}
