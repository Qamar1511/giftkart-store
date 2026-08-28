import React, { Suspense, lazy, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./styles/theme.css";
import { CartProvider } from "./context/CartContext";
import { ThemeProvider } from "./context/ThemeContext";
import { CurrencyProvider } from "./context/CurrencyContext";
import Home from "./pages/Home";
import BrandProducts from "./pages/BrandProducts";
import Cart from "./pages/Cart";
import CheckoutAddress from "./pages/CheckoutAddress";
import CheckoutPayment from "./pages/CheckoutPayment";
import Layout from "./components/Layout";
import ScrollToTop from "./components/ScrollToTop";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";

// Code-split the routes that aren't part of the first-paint shopping flow, so
// their JS is fetched only when visited. The admin panel (its own heavier
// bundle) and the low-traffic pages below are the biggest wins; Home, brand,
// cart and checkout stay eager so the core journey has no chunk wait.
//
// The named imports below are also prefetched during idle time (see useEffect
// in App). Without that, clicking through meant waiting for a chunk download
// BEFORE the page could even start fetching data — a blank Suspense box
// followed by a loading state.
const importBlog = () => import("./pages/Blog");
const importBlogPost = () => import("./pages/BlogPost");

// The four auth pages are lazy too. Nobody lands on the homepage and logs in
// within the first second, but their JS plus the 18KB of Auth.css they import
// was sitting in the main bundle for every visitor — pure weight on mobile,
// where JS parse time is the expensive part. Prefetched on idle like the blog,
// so a click on "Login" still has the chunk ready.
const importLogin = () => import("./pages/Login");
const importSignup = () => import("./pages/Signup");
const importForgotPassword = () => import("./pages/ForgotPassword");
const importResetPassword = () => import("./pages/ResetPassword");

const Login = lazy(importLogin);
const Signup = lazy(importSignup);
const ForgotPassword = lazy(importForgotPassword);
const ResetPassword = lazy(importResetPassword);
const OrderConfirmation = lazy(() => import("./pages/OrderConfirmation"));
const OrderHistory = lazy(() => import("./pages/OrderHistory"));
const PaypalReturn = lazy(() => import("./pages/PaypalReturn"));
const Contact = lazy(() => import("./pages/Contact"));
const RefundPolicy = lazy(() => import("./pages/RefundPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const Blog = lazy(importBlog);
const BlogPost = lazy(importBlogPost);
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders"));
const AdminStock = lazy(() => import("./pages/admin/AdminStock"));
const AdminPricing = lazy(() => import("./pages/admin/AdminPricing"));
const AdminQueries = lazy(() => import("./pages/admin/AdminQueries"));
const AdminBlog = lazy(() => import("./pages/admin/AdminBlog"));
const AdminBlogEditor = lazy(() => import("./pages/admin/AdminBlogEditor"));

function App() {
  // Warm the code-split chunks people are most likely to click, once the
  // browser is idle. This runs after first paint, so it can't compete with the
  // homepage LCP, and it means a later click on "Blog" or "Login" renders the
  // page shell immediately instead of downloading JS first.
  useEffect(() => {
    const prefetch = () => {
      importBlog();
      importBlogPost();
      importLogin();
      importSignup();
    };
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(prefetch, { timeout: 4000 });
      return () => window.cancelIdleCallback(id);
    }
    // Safari has no requestIdleCallback — a timeout is close enough here.
    const timer = setTimeout(prefetch, 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <ThemeProvider>
      <CurrencyProvider>
        <CartProvider>
          <BrowserRouter>
        <ScrollToTop />
        <Suspense fallback={<div style={{ minHeight: "60vh" }} aria-busy="true" />}>
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
            <Route path="pricing" element={<AdminPricing />} />
            <Route path="queries" element={<AdminQueries />} />
            <Route path="blog" element={<AdminBlog />} />
            <Route path="blog/new" element={<AdminBlogEditor />} />
            <Route path="blog/:id/edit" element={<AdminBlogEditor />} />
          </Route>

          {/* Everything else uses the Navbar + Footer shell */}
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/gift-cards" element={<Navigate to="/" replace />} />
            {/* Keyword-friendly alias used in blog content and shared links.
                Without it the catch-all below would serve a "coming soon"
                page, which reads as a broken link to shoppers and crawlers. */}
            <Route path="/playstation-gift-cards" element={<Navigate to="/brand/psn" replace />} />
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
        </Suspense>
      </BrowserRouter>
        </CartProvider>
      </CurrencyProvider>
    </ThemeProvider>
  );
}

export default App;
