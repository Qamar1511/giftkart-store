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
const PaypalCancel = lazy(() => import("./pages/PaypalCancel"));
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
const AdminReviews = lazy(() => import("./pages/admin/AdminReviews"));
const AdminQueries = lazy(() => import("./pages/admin/AdminQueries"));
const AdminBlog = lazy(() => import("./pages/admin/AdminBlog"));
const AdminBlogEditor = lazy(() => import("./pages/admin/AdminBlogEditor"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminUserDetail = lazy(() => import("./pages/admin/AdminUserDetail"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Keyword-friendly URLs that blog copy, ads and shared links use instead of the
// real /brand/<slug> path. Every one of these used to fall through to the
// catch-all "Coming soon" page — a broken link for shoppers and a soft 404 for
// Googlebot crawling the blog.
//
// In production Vercel redirects these with a real 301 before React even loads
// (see the "redirects" block in client/vercel.json) — that's the version Google
// sees. The routes below are the same map for `npm start`, where vercel.json
// isn't applied, and for any in-app <Link> that ever points at an alias. Keep
// the two lists in sync.
const BRAND_URL_ALIASES = {
  "playstation-gift-cards": "psn",
  "psn-gift-cards": "psn",
  "steam-gift-cards": "steam",
  "xbox-gift-cards": "xbox",
  "amazon-gift-cards": "amazon",
  "flipkart-gift-cards": "flipkart",
  "google-play-gift-cards": "google-play",
  "netflix-gift-cards": "netflix",
  "swiggy-gift-cards": "swiggy",
  "dominos-gift-cards": "dominos",
  "paypal-gift-cards": "paypal",
};


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
            <Route path="reviews" element={<AdminReviews />} />
            <Route path="queries" element={<AdminQueries />} />
            <Route path="blog" element={<AdminBlog />} />
            <Route path="blog/new" element={<AdminBlogEditor />} />
            <Route path="blog/:id/edit" element={<AdminBlogEditor />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="users/:id" element={<AdminUserDetail />} />
          </Route>

          {/* Everything else uses the Navbar + Footer shell */}
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/gift-cards" element={<Navigate to="/" replace />} />
            {Object.entries(BRAND_URL_ALIASES).map(([alias, slug]) => (
              <Route
                key={alias}
                path={`/${alias}`}
                element={<Navigate to={`/brand/${slug}`} replace />}
              />
            ))}
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
            <Route
              path="/paypal/cancel"
              element={
                <ProtectedRoute>
                  <PaypalCancel />
                </ProtectedRoute>
              }
            />

            {/* Anything else gets a real not-found page: it links back into the
                catalogue instead of dead-ending, and sets robots noindex so
                junk URLs stop eating crawl budget. */}
            <Route path="*" element={<NotFound />} />
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
