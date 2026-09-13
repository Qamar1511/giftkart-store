import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useCurrency } from "../context/CurrencyContext";
import { getSession } from "../services/authService";
import { getBrand } from "../data/catalog";
import "../styles/Shop.css";
import Seo from "../components/Seo";

// Digital delivery only — no shipping address needed. These are just the
// contact details that go on the invoice, defaulted from the signed-in
// account but editable in case someone wants a different invoice contact
// for this particular order.
const initialAddress = {
  fullName: "",
  phone: "",
  email: "",
  country: "India",
};

// Common list for the Country dropdown. India first since that's who most
// of our customers are; the rest is alphabetical.
const COUNTRIES = [
  "India",
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Argentina", "Armenia",
  "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados",
  "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina",
  "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cambodia",
  "Cameroon", "Canada", "Chad", "Chile", "China", "Colombia", "Congo", "Costa Rica",
  "Croatia", "Cuba", "Cyprus", "Czech Republic", "Denmark", "Djibouti", "Dominican Republic",
  "Ecuador", "Egypt", "El Salvador", "Estonia", "Ethiopia", "Fiji", "Finland", "France",
  "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Guatemala", "Guinea",
  "Guyana", "Haiti", "Honduras", "Hong Kong", "Hungary", "Iceland", "Indonesia", "Iran",
  "Iraq", "Ireland", "Israel", "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan",
  "Kenya", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia",
  "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Macau", "Madagascar", "Malawi",
  "Malaysia", "Maldives", "Mali", "Malta", "Mauritius", "Mexico", "Moldova", "Monaco",
  "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar", "Namibia", "Nepal",
  "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea",
  "North Macedonia", "Norway", "Oman", "Pakistan", "Palestine", "Panama",
  "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar",
  "Romania", "Russia", "Rwanda", "Saudi Arabia", "Senegal", "Serbia", "Seychelles",
  "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Somalia", "South Africa",
  "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden",
  "Switzerland", "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Togo",
  "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Uganda", "Ukraine",
  "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan",
  "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe",
];

const CheckoutAddress = () => {
  const navigate = useNavigate();
  const { items } = useCart();
  const { formatMoney, priceFor, totalFor } = useCurrency();
  const session = getSession();

  // Defaulted from the account's registered details — all still editable.
  const [address, setAddress] = useState(() => ({
    ...initialAddress,
    fullName: session?.user?.fullName || "",
    phone: session?.user?.phone || "",
    email: session?.user?.email || "",
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
    const required = ["fullName", "phone", "email", "country"];
    for (const field of required) {
      if (!address[field]) {
        setError("Please fill in every field.");
        return;
      }
    }
    if (!/^\d{10}$/.test(address.phone.replace(/\D/g, ""))) {
      setError("Enter a valid 10-digit phone number.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(address.email)) {
      setError("Enter a valid email address.");
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
          Digital delivery — these details go on your invoice, not for shipping.
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
            <span>Email</span>
            <input name="email" type="email" value={address.email} onChange={handleChange} />
          </label>
          <label className="auth-field">
            <span>Country</span>
            <select
              name="country"
              value={address.country}
              onChange={handleChange}
              className="address-select"
            >
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
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
