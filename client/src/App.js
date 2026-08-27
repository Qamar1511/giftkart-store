import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./styles/theme.css";
import { CartProvider } from "./context/CartContext";
import { ThemeProvider } from "./context/ThemeContext";
import { CurrencyProvider } from "./context/CurrencyContext";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Home from "./pages/Home";
import BrandProducts from "./pages/BrandProducts";
import Cart from "./pages/Cart";
import CheckoutAddress from "./pages/CheckoutAddress";
import CheckoutPayment from "./pages/CheckoutPayment";
import OrderConfirmation from "./pages/OrderConfirmation";
import OrderHistory from "./pages/OrderHistory";
import PaypalReturn from "./pages/PaypalReturn";
import Contact from "./pages/Contact";
import RefundPolicy from "./pages/RefundPolicy";
import TermsOfService from "./pages/TermsOfService";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import Layout from "./components/Layout";
import ScrollToTop from "./components/ScrollToTop";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminStock from "./pages/admin/AdminStock";
import AdminQueries from "./pages/admin/AdminQueries";
import AdminBlog from "./pages/admin/AdminBlog";
import AdminBlogEditor from "./pages/admin/AdminBlogEditor";

function App() {
  return (
    <ThemeProvider>
      <CurrencyProvider>
        <CartProvider>
          <BrowserRouter>
        <ScrollToTop />
        <Routes>
          {/* Auth pages are full-screen, no Navbar/Footer */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />

          {/* Admin panel — own sidebar shell, gated to role === "admin" */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="stock" element={<AdminStock />} />
            <Route path="queries" element={<AdminQueries />} />
            <Route path="blog" element={<AdminBlog />} />
            <Route path="blog/new" element={<AdminBlogEditor />} />
            <Route path="blog/:id/edit" element={<AdminBlogEditor />} />
          </Route>

          {/* Everything else uses the Navbar + Footer shell */}
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/gift-cards" element={<Navigate to="/" replace />} />
            <Route path="/brand/:slug" element={<BrandProducts />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/refund-policy" element={<RefundPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPost />} />

            <Route
              path="/checkout/address"
              element={
                <ProtectedRoute>
                  <CheckoutAddress />
                </ProtectedRoute>
              }
            />
            <Route
              path="/checkout/payment"
              element={
                <ProtectedRoute>
                  <CheckoutPayment />
                </ProtectedRoute>
              }
            />
            <Route
              path="/order-confirmation/:orderId"
              element={
                <ProtectedRoute>
                  <OrderConfirmation />
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders"
              element={
                <ProtectedRoute>
                  <OrderHistory />
                </ProtectedRoute>
              }
            />
            <Route
              path="/paypal/return"
              element={
                <ProtectedRoute>
                  <PaypalReturn />
                </ProtectedRoute>
              }
            />

            {/* Anything else falls through to a simple "coming soon" page */}
            <Route
              path="*"
              element={
                <div style={{ padding: "4rem 2rem", textAlign: "center" }}>
                  <h2 style={{ fontFamily: "Rajdhani, sans-serif" }}>Coming soon</h2>
                  <p style={{ color: "var(--text-muted)" }}>This page hasn't been built yet.</p>
                </div>
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
        </CartProvider>
      </CurrencyProvider>
    </ThemeProvider>
  );
}

export default App;
