import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart, MAX_QUANTITY_PER_ITEM } from "../context/CartContext";
import { getSession } from "../services/authService";
import { requestStockNotification } from "../services/productService";
import BrandBadge from "./BrandBadge";

const GiftCardCard = ({ product, color }) => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const maxQty = Math.max(0, Math.min(MAX_QUANTITY_PER_ITEM, product.availableStock ?? MAX_QUANTITY_PER_ITEM));
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const [notifyState, setNotifyState] = useState("idle"); // idle | sending | done | error
  const [notifyError, setNotifyError] = useState("");

  const handleAdd = () => {
    addToCart(product.brand, product.denomination, quantity, product.availableStock);
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
      <div className="giftcard-card-image-wrap">
        {product.image ? (
          <img
            src={product.image}
            alt={`${product.brandName} Gift Card ₹${product.denomination}`}
            className="giftcard-card-image"
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
          <p className="giftcard-card-amount">₹{product.denomination.toLocaleString("en-IN")}</p>
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

        {product.inStock && product.availableStock < 5 && (
          <p className="giftcard-card-stock-hint">Only {product.availableStock} left</p>
        )}
      </div>
    </div>
  );
};

export default GiftCardCard;
