import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { capturePaypalOrder } from "../services/paymentService";
import Seo from "../components/Seo";

const PaypalReturn = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const orderId = searchParams.get("orderId");

  useEffect(() => {
    const finalize = async () => {
      if (!orderId) {
        setError("Missing order reference.");
        return;
      }
      try {
        await capturePaypalOrder(orderId);
        navigate(`/order-confirmation/${orderId}`);
      } catch (err) {
        setError(err.response?.data?.message || "Couldn't confirm your PayPal payment.");
      }
    };
    finalize();
  }, [orderId, navigate]);

  return (
    <div className="buy-page">
      <Seo title="Confirming Payment — GIFTKART" path="/paypal/return" noindex />
      <div className="usdt-invoice-card">
        {error ? (
          <>
            <h2>Payment confirmation failed</h2>
            <p className="shop-status shop-status-error">{error}</p>
          </>
        ) : (
          <>
            <h2>Confirming your PayPal payment…</h2>
            <p className="shop-status">Please don't close this page.</p>
          </>
        )}
      </div>
    </div>
  );
};

export default PaypalReturn;
