import React, { useState } from "react";
import { useCart, MAX_QUANTITY_PER_ITEM } from "../context/CartContext";
import BrandBadge from "./BrandBadge";

const GiftCardCard = ({ product, color }) => {
  const { addToCart } = useCart();
  const maxQty = Math.max(0, Math.min(MAX_QUANTITY_PER_ITEM, product.availableStock ?? MAX_QUANTITY_PER_ITEM));
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  const handleAdd = () => {
    addToCart(product.brand, product.denomination, quantity, product.availableStock);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
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

        <div className="giftcard-card-controls">
          <div className="qty-stepper">
            <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} disabled={!product.inStock}>
              −
            </button>
            <span>{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
              disabled={!product.inStock || quantity >= maxQty}
            >
              +
            </button>
          </div>

          <button className="giftcard-card-btn" disabled={!product.inStock} onClick={handleAdd}>
            {!product.inStock ? "Notify me" : justAdded ? "Added ✓" : "Add to cart"}
          </button>
        </div>
        {product.inStock && product.availableStock < 5 && (
          <p className="giftcard-card-stock-hint">Only {product.availableStock} left</p>
        )}
      </div>
    </div>
  );
};

export default GiftCardCard;
