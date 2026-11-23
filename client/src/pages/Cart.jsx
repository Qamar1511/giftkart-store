import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useCurrency } from "../context/CurrencyContext";
import { getSession } from "../services/authService";
import { getGiftCardProducts } from "../services/productService";
import { getBrand } from "../data/catalog";
import BrandBadge from "../components/BrandBadge";
import "../styles/Shop.css";
import Seo from "../components/Seo";

const Cart = () => {
  const navigate = useNavigate();
  const { items, setQuantity, removeFromCart, totalItems, cartFull, maxCardsPerOrder } = useCart();
  const { formatMoney, formatPrice, priceFor, totalFor } = useCurrency();
  const [stockByKey, setStockByKey] = useState(null);

  // Load live stock so the +/- stepper here can never go above what's
  // actually available right now (stock can change after items were added).
  useEffect(() => {
    let cancelled = false;
    getGiftCardProducts()
      .then(({ products }) => {
        if (cancelled) return;
        setStockByKey(new Map(products.map((p) => [`${p.brand}-${p.denomination}`, p.availableStock])));
      })
      .catch(() => {
        if (!cancelled) setStockByKey(new Map()); // fail open-ish: checkout still enforces the real check
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
        <Seo title="Your Cart — GIFTKART" path="/cart" noindex />
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
      <Seo title="Your Cart — GIFTKART" path="/cart" noindex />
      <h1 className="section-heading">Your cart ({totalItems} item{totalItems !== 1 ? "s" : ""})</h1>

      <div className="cart-list">
        {items.map((item) => {
          const brand = getBrand(item.brand);
          const available = stockByKey?.get(`${item.brand}-${item.denomination}`);
          const atStockMax = available != null && item.quantity >= available;
          // Can't add another card once the whole order is at the cap.
          const atMax = atStockMax || cartFull;
          return (
            <div className="cart-row" key={`${item.brand}-${item.denomination}`}>
              <div className="cart-row-image-wrap">
                <BrandBadge name={brand.name} color={brand.color} image={brand.image} size="sm" />
              </div>
              <div className="cart-row-info">
                <p className="cart-row-title">{brand.name} — ₹{item.denomination.toLocaleString("en-IN")}</p>
                <p className="order-row-meta">
                  {formatPrice(item.denomination)} each
                  {available != null && available < 5 && (
                    <span className="cart-row-stock-warning"> · Only {available} left</span>
                  )}
                </p>
              </div>
              <div className="qty-stepper">
                <button type="button" onClick={() => setQuantity(item.brand, item.denomination, item.quantity - 1)}>
                  −
                </button>
                <span>{item.quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity(item.brand, item.denomination, item.quantity + 1, available)}
                  disabled={atMax}
                  title={
                    cartFull && !atStockMax
                      ? `Limit is ${maxCardsPerOrder} cards per order`
                      : atStockMax
                      ? "That's all we have in stock"
                      : undefined
                  }
                >
                  +
                </button>
              </div>
              <p className="cart-row-subtotal">
                {formatMoney(priceFor(item.denomination) * item.quantity)}
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
          <strong>{formatMoney(totalFor(items))}</strong>
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
