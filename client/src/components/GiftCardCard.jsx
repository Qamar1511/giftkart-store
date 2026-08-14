import React, { useState } from "react";
import { useCart } from "../context/CartContext";
import BrandBadge from "./BrandBadge";

const GiftCardCard = ({ product, color }) => {
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  const handleAdd = () => {
    addToCart(product.brand, product.denomination, quantity);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  };

  return (
    <div className="giftcard-card">
      <div className="giftcard-card-image-wrap">
        {product.image ? (
          <img
            src={product.image}
            alt={`${product.brandName} ₹${product.denomination}`}
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
            <button type="button" onClick={() => setQuantity((q) => Math.min(20, q + 1))} disabled={!product.inStock}>
              +
            </button>
          </div>

          <button className="giftcard-card-btn" disabled={!product.inStock} onClick={handleAdd}>
            {!product.inStock ? "Notify me" : justAdded ? "Added ✓" : "Add to cart"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GiftCardCard;
