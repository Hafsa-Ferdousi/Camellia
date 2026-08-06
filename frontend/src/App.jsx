import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { LanguageProvider } from "./context/LanguageContext";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ScrollToTop from "./components/ScrollToTop";
import ChatWidget from "./components/ChatWidget";
import Home from "./pages/Home";
import Products from "./pages/Products";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import VerifyEmail from "./pages/VerifyEmail";
import Security from "./pages/Security";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderConfirmation from "./pages/OrderConfirmation";
import OrderHistory from "./pages/OrderHistory";
import TrackOrder from "./pages/TrackOrder";        // ✅ KEEP THIS ONE
import Admin from "./pages/Admin";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Legal from "./pages/Legal";
import WishlistPage from "./pages/Wishlist";
import Settings from "./pages/Settings";
import Notifications from "./pages/Notifications";
import ProtectedRoute from "./components/ProtectedRoute";

function SiteLayout() {
  return (
    <>
      <Navbar />
      <main style={{ minHeight: "60vh" }}><Outlet /></main>
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
            <Routes>
              <Route path="/admin" element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
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
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}