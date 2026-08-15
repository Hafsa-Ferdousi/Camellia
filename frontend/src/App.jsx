import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { LanguageProvider } from "./context/LanguageContext";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ScrollToTop from "./components/ScrollToTop";
import ChatWidget from "./components/ChatWidget";
import ProtectedRoute from "./components/ProtectedRoute";
import ErrorBoundary from "./components/ErrorBoundary";
import PageFallback from "./components/PageFallback";
// Home is the most common landing route, so it's imported eagerly — every
// other page is code-split so a first-time visitor isn't downloading the
// admin panel, checkout, and every other page before seeing anything.
import Home from "./pages/Home";

const Products         = lazy(() => import("./pages/Products"));
const Login            = lazy(() => import("./pages/Login"));
const Register          = lazy(() => import("./pages/Register"));
const ForgotPassword    = lazy(() => import("./pages/ForgotPassword"));
const VerifyEmail       = lazy(() => import("./pages/VerifyEmail"));
const Security          = lazy(() => import("./pages/Security"));
const ProductDetail     = lazy(() => import("./pages/ProductDetail"));
const Cart              = lazy(() => import("./pages/Cart"));
const Checkout          = lazy(() => import("./pages/Checkout"));
const OrderConfirmation = lazy(() => import("./pages/OrderConfirmation"));
const OrderHistory      = lazy(() => import("./pages/OrderHistory"));
const TrackOrder        = lazy(() => import("./pages/TrackOrder"));
const Admin             = lazy(() => import("./pages/Admin"));
const About              = lazy(() => import("./pages/About"));
const Contact            = lazy(() => import("./pages/Contact"));
const Legal              = lazy(() => import("./pages/Legal"));
const WishlistPage       = lazy(() => import("./pages/Wishlist"));
const Settings           = lazy(() => import("./pages/Settings"));
const Notifications      = lazy(() => import("./pages/Notifications"));

function SiteLayout() {
  return (
    <>
      <Navbar />
      <main style={{ minHeight: "60vh" }}>
        <Suspense fallback={<PageFallback />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <ChatWidget />
    </>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <CartProvider>
          <BrowserRouter>
            <ScrollToTop />
            <ErrorBoundary>
              <Routes>
                <Route path="/admin" element={<ProtectedRoute adminOnly><Suspense fallback={<PageFallback />}><Admin /></Suspense></ProtectedRoute>} />
                <Route element={<SiteLayout />}>
                  <Route path="/"                   element={<Home />} />
                  <Route path="/products"            element={<Products />} />
                  <Route path="/products/:id"        element={<ProductDetail />} />
                  <Route path="/login"               element={<Login />} />
                  <Route path="/register"            element={<Register />} />
                  <Route path="/forgot-password"     element={<ForgotPassword />} />
                  <Route path="/verify-email"        element={<VerifyEmail />} />
                  <Route path="/security"            element={<ProtectedRoute><Security /></ProtectedRoute>} />
                  <Route path="/cart"                element={<ProtectedRoute blockAdmin><Cart /></ProtectedRoute>} />
                  <Route path="/checkout"            element={<ProtectedRoute blockAdmin><Checkout /></ProtectedRoute>} />
                  <Route path="/order-confirmation"  element={<OrderConfirmation />} />
                  <Route path="/order-confirmation/:orderId" element={<OrderConfirmation />} />
                  <Route path="/orders"              element={<ProtectedRoute><OrderHistory /></ProtectedRoute>} />
                  <Route path="/track-order"         element={<TrackOrder />} />
                  <Route path="/about"               element={<About />} />
                  <Route path="/contact"             element={<Contact />} />
                  <Route path="/legal/:page"         element={<Legal />} />
                  <Route path="/wishlist"            element={<ProtectedRoute><WishlistPage /></ProtectedRoute>} />
                  <Route path="/settings"             element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                  <Route path="/notifications"        element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
                </Route>
              </Routes>
            </ErrorBoundary>
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}