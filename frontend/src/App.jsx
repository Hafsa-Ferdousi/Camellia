import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Products from "./pages/Products";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderConfirmation from "./pages/OrderConfirmation";
import Orders from "./pages/Orders";
import Admin from "./pages/Admin";
import About from "./pages/About";
function SiteLayout() {
  return (
    <>
      <Navbar />
      <main style={{ minHeight: "60vh" }}><Outlet /></main>
      <Footer />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/admin" element={<Admin />} />
            <Route element={<SiteLayout />}>
              <Route path="/"               element={<Home />} />
              <Route path="/products"        element={<Products />} />
              <Route path="/products/:id"    element={<ProductDetail />} />
              <Route path="/login"           element={<Login />} />
              <Route path="/register"        element={<Register />} />
              <Route path="/cart"            element={<Cart />} />
              <Route path="/checkout"        element={<Checkout />} />
              <Route path="/order-confirmation" element={<OrderConfirmation />} />
              <Route path="/orders"          element={<Orders />} />
              <Route path="/about" element={<About />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}
