import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart, MAX_QUANTITY_PER_ITEM, MAX_CARDS_PER_ORDER } from "../context/CartContext";
import { useCurrency } from "../context/CurrencyContext";
import { getSession } from "../services/authService";
import { requestStockNotification } from "../services/productService";
import flyToCart from "../utils/flyToCart";
import BrandBadge from "./BrandBadge";

const GiftCardCard = ({ product, color }) => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { formatProduct } = useCurrency();
  // A single order can hold at most MAX_CARDS_PER_ORDER cards, so there's no
  // point letting the stepper climb past that here either.
  const maxQty = Math.max(
    0,
    Math.min(MAX_QUANTITY_PER_ITEM, MAX_CARDS_PER_ORDER, product.availableStock ?? MAX_QUANTITY_PER_ITEM)
  );
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const [limitHint, setLimitHint] = useState("");
  const [notifyState, setNotifyState] = useState("idle"); // idle | sending | done | error
  const [notifyError, setNotifyError] = useState("");
  const imageRef = useRef(null);

  const handleAdd = () => {
    const { added } = addToCart(product.brand, product.denomination, quantity, product.availableStock);

    // Cart is already at the per-order card limit — don't fake a success or
    // fly an item that never landed; nudge the shopper instead.
    if (added <= 0) {
      setLimitHint(`Limit is ${MAX_CARDS_PER_ORDER} cards per order`);
      setTimeout(() => setLimitHint(""), 2500);
      return;
    }

    // Fly a shrinking clone of the card image up into the navbar cart icon.
    flyToCart(imageRef.current, {
      imageSrc: product.image,
      color,
      label: product.brandName,
    });
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  };

  const handleNotify = async () => {
    if (!getSession()) {
      navigate("/login", { state: { from: { pathname: "/" } } });
      return;
    }
    setNotifyState("sending");
    setNotifyError("");
    try {
      await requestStockNotification(product.brand, product.denomination);
      setNotifyState("done");
    } catch (err) {
      setNotifyState("error");
      setNotifyError(err.response?.data?.message || "Couldn't set that up. Try again.");
    }
  };

  return (
    <div className="giftcard-card">
      <div className="giftcard-card-image-wrap" ref={imageRef}>
        {product.image ? (
          <img
            src={product.image}
            alt={`${product.brandName} Gift Card ₹${product.denomination}`}
            className="giftcard-card-image"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="giftcard-card-badge-wrap">
            <BrandBadge name={product.brandName} color={color} size="lg" />
          </div>
        )}
      </div>

      <div className="giftcard-card-body">
        <p className="giftcard-card-console">{product.brandName}</p>
        <div className="giftcard-card-price-row">
          <p className="giftcard-card-amount">{formatProduct(product)}</p>
          <span className={`giftcard-stock-pill ${product.inStock ? "in-stock" : "out-of-stock"}`}>
            {product.inStock ? "In stock" : "Out of stock"}
          </span>
        </div>
        <p className="giftcard-card-title">{product.title || "Gift Card"}</p>

        {product.inStock ? (
          <div className="giftcard-card-controls">
            <div className="qty-stepper">
              <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))}>
                −
              </button>
              <span>{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                disabled={quantity >= maxQty}
              >
                +
              </button>
            </div>

            <button className="giftcard-card-btn" onClick={handleAdd}>
              {justAdded ? "Added ✓" : "Add to cart"}
            </button>
          </div>
        ) : (
          <div className="giftcard-card-controls">
            <button
              className="giftcard-card-btn giftcard-card-btn-notify"
              onClick={handleNotify}
              disabled={notifyState === "sending" || notifyState === "done"}
            >
              {notifyState === "done"
                ? "We'll email you ✓"
                : notifyState === "sending"
                ? "Setting up…"
                : "Notify me"}
            </button>
          </div>
        )}

        {notifyState === "error" && <p className="giftcard-card-notify-error">{notifyError}</p>}

        {limitHint && <p className="giftcard-card-limit-hint">{limitHint}</p>}
      </div>
    </div>
  );
};

export default GiftCardCard;
