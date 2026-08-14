import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { getSession } from "../services/authService";
import { getBrand } from "../data/catalog";
import BrandBadge from "../components/BrandBadge";
import "../styles/Shop.css";

const Cart = () => {
  const navigate = useNavigate();
  const { items, setQuantity, removeFromCart, totalItems, totalAmount } = useCart();

  const handleCheckout = () => {
    const session = getSession();
    if (!session) {
      navigate("/login", { state: { from: { pathname: "/checkout/address" } } });
      return;
    }
    navigate("/checkout/address");
  };

  if (items.length === 0) {
    return (
      <div className="shop-page">
        <h1 className="section-heading">Your cart</h1>
        <div className="empty-orders">
          <p>Your cart is empty.</p>
          <button className="auth-submit" onClick={() => navigate("/")}>
            Browse gift cards
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="shop-page cart-page">
      <div
        className="checkout-bg-decor cart-bg-decor"
        style={{ backgroundImage: "url(/images/cart-bg.png)" }}
        aria-hidden="true"
      />
      <h1 className="section-heading">Your cart ({totalItems} item{totalItems !== 1 ? "s" : ""})</h1>

      <div className="cart-list">
        {items.map((item) => {
          const brand = getBrand(item.brand);
          return (
            <div className="cart-row" key={`${item.brand}-${item.denomination}`}>
              <div className="cart-row-image-wrap">
                <BrandBadge name={brand.name} color={brand.color} image={brand.image} size="sm" />
              </div>
              <div className="cart-row-info">
                <p className="cart-row-title">{brand.name} — ₹{item.denomination.toLocaleString("en-IN")}</p>
                <p className="order-row-meta">₹{item.denomination.toLocaleString("en-IN")} each</p>
              </div>
              <div className="qty-stepper">
                <button type="button" onClick={() => setQuantity(item.brand, item.denomination, item.quantity - 1)}>
                  −
                </button>
                <span>{item.quantity}</span>
                <button type="button" onClick={() => setQuantity(item.brand, item.denomination, item.quantity + 1)}>
                  +
                </button>
              </div>
              <p className="cart-row-subtotal">
                ₹{(item.denomination * item.quantity).toLocaleString("en-IN")}
              </p>
              <button
                className="cart-row-remove"
                onClick={() => removeFromCart(item.brand, item.denomination)}
                aria-label="Remove"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>

      <div className="cart-summary">
        <div>
          <span>Total</span>
          <strong>₹{totalAmount.toLocaleString("en-IN")}</strong>
        </div>
        <button className="auth-submit" onClick={handleCheckout}>
          Proceed to checkout
        </button>
        <Link to="/" className="footer-link" style={{ textAlign: "center", marginTop: "0.5rem" }}>
          Continue shopping
        </Link>
      </div>
    </div>
  );
};

export default Cart;
