import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { cancelOrder } from "../services/orderService";
import Seo from "../components/Seo";

// PayPal sends the shopper here when they hit "Cancel and return to
// GIFTKART" on the PayPal approval page. Previously this redirected
// straight to /cart, leaving the order sitting unpaid until the
// 15-minute abandoned-order sweep cancelled it and released the stock.
// This cancels it immediately instead.
const PaypalCancel = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get("orderId");

  useEffect(() => {
    const finalize = async () => {
      if (orderId) {
        try {
          await cancelOrder(orderId, "Cancelled by customer on PayPal");
        } catch {
          // Order may already be cancelled (e.g. by the abandoned-order
          // sweep) — either way there's nothing more to do here.
        }
      }
      navigate("/cart", { replace: true });
    };
    finalize();
  }, [orderId, navigate]);

  return (
    <div className="buy-page">
      <Seo title="Payment Cancelled — GIFTKART" path="/paypal/cancel" noindex />
      <div className="usdt-invoice-card">
        <h2>Cancelling your order…</h2>
        <p className="shop-status">Please don't close this page.</p>
      </div>
    </div>
  );
};

export default PaypalCancel;
