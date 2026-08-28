import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useCurrency } from "../context/CurrencyContext";
import { getSession } from "../services/authService";
import { getBrand } from "../data/catalog";
import "../styles/Shop.css";
import Seo from "../components/Seo";

const initialAddress = {
  fullName: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  pincode: "",
  country: "India",
};

// All Indian states + union territories, for the State dropdown. Country is
// fixed to India (digital delivery — address is only used on the invoice).
const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  // Union Territories
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

const CheckoutAddress = () => {
  const navigate = useNavigate();
  const { items } = useCart();
  const { formatMoney, priceFor, totalFor } = useCurrency();
  const session = getSession();

  const [address, setAddress] = useState(() => ({
    ...initialAddress,
    fullName: session?.user?.fullName || "",
  }));
  const [error, setError] = useState("");

  if (items.length === 0) {
    navigate("/cart", { replace: true });
    return null;
  }

  const handleChange = (e) => {
    setAddress({ ...address, [e.target.name]: e.target.value });
    if (error) setError("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const required = ["fullName", "phone", "line1", "city", "state", "pincode"];
    for (const field of required) {
      if (!address[field]) {
        setError("Please fill in every required address field.");
        return;
      }
    }
    if (!/^\d{10}$/.test(address.phone.replace(/\D/g, ""))) {
      setError("Enter a valid 10-digit phone number.");
      return;
    }
    if (!/^\d{6}$/.test(address.pincode)) {
      setError("Enter a valid 6-digit pincode.");
      return;
    }
    navigate("/checkout/payment", { state: { address } });
  };

  return (
    <div className="buy-page checkout-address-page">
      <Seo title="Checkout — GIFTKART" path="/checkout/address" noindex />
      <div
        className="checkout-bg-decor"
        style={{ backgroundImage: "url(/images/checkout-bg.png)" }}
        aria-hidden="true"
      />
      <div className="buy-summary-card">
        <span className="giftcard-card-console">Order summary</span>
        {items.map((item) => (
          <div className="confirmation-row" key={`${item.brand}-${item.denomination}`}>
            <span>
              {getBrand(item.brand).name} ₹{item.denomination.toLocaleString("en-IN")} × {item.quantity}
            </span>
            <strong>{formatMoney(priceFor(item.denomination) * item.quantity)}</strong>
          </div>
        ))}
        <div className="confirmation-row" style={{ borderTop: "1px solid var(--card-border)", marginTop: "0.5rem", paddingTop: "0.75rem" }}>
          <span>Total</span>
          <strong>{formatMoney(totalFor(items))}</strong>
        </div>
      </div>

      <form className="buy-form-card" onSubmit={handleSubmit}>
        <h2 className="auth-form-title">Delivery details</h2>
        <p className="auth-form-sub">
          Digital delivery — this address is used for your invoice, not for shipping.
        </p>

        {error && <div className="auth-error" role="alert">{error}</div>}

        <div className="address-grid">
          <label className="auth-field">
            <span>Full name</span>
            <input name="fullName" value={address.fullName} onChange={handleChange} />
          </label>
          <label className="auth-field">
            <span>Phone</span>
            <input name="phone" value={address.phone} onChange={handleChange} />
          </label>
          <label className="auth-field address-full-width">
            <span>Address line 1</span>
            <input name="line1" value={address.line1} onChange={handleChange} />
          </label>
          <label className="auth-field address-full-width">
            <span>Address line 2 (optional)</span>
            <input name="line2" value={address.line2} onChange={handleChange} />
          </label>
          <label className="auth-field">
            <span>City</span>
            <input name="city" value={address.city} onChange={handleChange} />
          </label>
          <label className="auth-field">
            <span>State</span>
            <select
              name="state"
              value={address.state}
              onChange={handleChange}
              className="address-select"
            >
              <option value="" disabled>
                Select a state
              </option>
              {INDIAN_STATES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </label>
          <label className="auth-field">
            <span>Pincode</span>
            <input name="pincode" value={address.pincode} onChange={handleChange} />
          </label>
          <label className="auth-field">
            <span>Country</span>
            <input name="country" value={address.country} onChange={handleChange} disabled />
          </label>
        </div>

        <button type="submit" className="auth-submit" style={{ marginTop: "1rem" }}>
          Continue to payment
        </button>
      </form>
    </div>
  );
};

export default CheckoutAddress;
