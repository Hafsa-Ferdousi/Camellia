// frontend/src/pages/Checkout.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Checkout.css';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { checkout as checkoutApi, guestCheckout as guestCheckoutApi } from '../api/cart';
import { getPricing } from '../api/settings';

const PAYMENT_METHOD_MAP = {
  'Cash on Delivery': 'cod',
  'bKash': 'bkash',
  'Nagad': 'nagad',
  'Bank Transfer': 'bank',
};

// Helper to safely get string value from object or string
const getString = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value.en) return value.en;
  if (typeof value === 'object' && value.bn) return value.bn;
  return JSON.stringify(value);
};

//  NEW: Helper to safely get a number from any price format
const getNumber = (value) => {
  if (value === undefined || value === null) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  if (typeof value === 'object') {
    // If it's multilingual { en: ..., bn: ... }
    if (value.en !== undefined) return getNumber(value.en);
    if (value.bn !== undefined) return getNumber(value.bn);
    // If it's nested like { amount: ... } or { value: ... }
    if (value.amount !== undefined) return getNumber(value.amount);
    if (value.value !== undefined) return getNumber(value.value);
  }
  return 0;
};

const Checkout = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { items: cartItems, clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isGuest, setIsGuest] = useState(false);

  // Falls back to the store's current defaults until the live settings load.
  const [pricing, setPricing] = useState({ vatRate: 0.10, defaultDeliveryCharge: 150, districtDeliveryCharges: [{ district: "Cox's Bazar", charge: 70 }] });

  useEffect(() => {
    getPricing().then(({ data }) => setPricing(data)).catch(() => {});
  }, []);

  const deliveryCharges = {
    ...Object.fromEntries(pricing.districtDeliveryCharges.map(d => [d.district, d.charge])),
    default: pricing.defaultDeliveryCharge,
  };

  const calculateTotals = () => {
    const subtotal = cartItems.reduce((sum, item) => {
      //  Use getNumber to extract price safely
      const price = getNumber(item.product?.basePrice) || getNumber(item.product?.price) || getNumber(item.price) || 0;
      const qty = item.quantity || 1;
      return sum + (price * qty);
    }, 0);
    const vat = subtotal * pricing.vatRate;
    return { subtotal, vat };
  };

  const { subtotal, vat } = calculateTotals();

  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    mobileNumber: '',
    streetAddress: '',
    country: 'Bangladesh',
    district: '',
    city: '',
    zipCode: '',
    paymentMethod: 'Cash on Delivery',
    deliveryCharge: 0,
    total: subtotal + vat
  });

  // Prefill the greeting/name fields once we know who's actually logged in.
  useEffect(() => {
    if (user) {
      const [firstName, ...rest] = (user.name || '').split(' ');
      setFormData(prev => ({
        ...prev,
        email: user.email || prev.email,
        firstName: firstName || '',
        lastName: rest.join(' '),
      }));
    }
  }, [user]);

  const handleDistrictChange = (e) => {
    const district = e.target.value;
    const charge = deliveryCharges[district] || deliveryCharges['default'];
    setFormData({
      ...formData,
      district: district,
      deliveryCharge: charge,
      total: subtotal + vat + charge
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleGuestCheckout = () => {
    setIsGuest(true);
  };

  const submitGuestOrder = async () => {
    const items = cartItems.map((item) => ({
      productId: item.productId || item.product?._id,
      quantity: item.quantity || 1,
    }));

    const addressLine = [formData.streetAddress, formData.zipCode]
      .filter(Boolean)
      .join(', ');
    const paymentMethod = PAYMENT_METHOD_MAP[formData.paymentMethod] || 'cod';

    const { data: order } = await guestCheckoutApi(
      items,
      { addressLine, district: formData.district, city: formData.city, phone: formData.mobileNumber },
      paymentMethod,
      {
        name: `${formData.firstName} ${formData.lastName}`.trim() || 'Guest',
        email: formData.email,
        phone: formData.mobileNumber,
      }
    );
    return order;
  };

  const submitLoggedInOrder = async () => {
    const items = cartItems.map((item) => ({
      productId: item.productId || item.product?._id,
      quantity: item.quantity || 1,
    }));

    const addressLine = [formData.streetAddress, formData.zipCode]
      .filter(Boolean)
      .join(', ');
    const paymentMethod = PAYMENT_METHOD_MAP[formData.paymentMethod] || 'cod';

    const { data: order } = await checkoutApi(
      items,
      { addressLine, district: formData.district, city: formData.city, phone: formData.mobileNumber },
      paymentMethod
    );
    return order;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const order = isGuest ? await submitGuestOrder() : await submitLoggedInOrder();

      clearCart();
      navigate('/order-confirmation', { state: { order } });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Order failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const showAuthPrompt = !user && !isGuest;

  if (cartItems.length === 0) {
    return (
      <div className="checkout-page">
        <div className="checkout-container">
          <h1 className="checkout-title">CHECKOUT</h1>
          <p className="checkout-subtitle">Please fill in the fields below and place order to complete your purchase!</p>
          <div className="empty-cart-message" style={{ textAlign: 'center', padding: '60px 20px' }}>
            <h2>🛒 Your cart is empty</h2>
            <p style={{ color: '#888', marginBottom: 20 }}>Add some products to your cart before checking out.</p>
            <button className="auth-submit-btn" onClick={() => navigate('/products')} style={{ padding: '12px 30px' }}>Browse Products</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <div className="checkout-container">
        <h1 className="checkout-title">CHECKOUT</h1>
        <p className="checkout-subtitle">Please fill in the fields below and place order to complete your purchase!</p>

        {error && <div className="error-message">{error}</div>}

        {showAuthPrompt ? (
          <div className="auth-section-top">
            <p style={{ textAlign: 'center', marginBottom: 12 }}>
              Please log in, create an account, or continue as a guest to complete your purchase.
            </p>
            <div className="auth-row" style={{ justifyContent: 'center', gap: 12 }}>
              <Link to="/login" state={{ from: '/checkout' }} className="auth-submit-btn">Login</Link>
              <Link to="/register" state={{ from: '/checkout' }} className="auth-submit-btn">Register</Link>
            </div>
            <div className="auth-divider"><span>or</span></div>
            <div className="auth-guest-option">
              <button type="button" className="guest-link" onClick={handleGuestCheckout}>
                🛒 Continue as Guest (No Login Required)
              </button>
            </div>
          </div>
        ) : (
          <div className={`user-info-bar ${isGuest ? 'guest-mode' : ''}`}>
            <span>
              {user ? `👋 Welcome, ${user.name?.split(' ')[0] || 'User'}!` : '🛒 You are checking out as a Guest'}
            </span>
            <div>
              {isGuest && (
                <Link to="/login" state={{ from: '/checkout' }} className="login-link">
                  Login instead?
                </Link>
              )}
              {user && (
                <button className="logout-btn" onClick={async () => { await logout(); navigate('/login', { state: { from: '/checkout' } }); }}>
                  Logout
                </button>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="checkout-form">
          <div className="checkout-grid">
            <div className="shipping-section">
              <h2>SHIPPING ADDRESS</h2>

              <div className="form-group">
                <label>Email Address *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  required
                />
                <small className="field-hint">
                  {isGuest ? 'We will send order confirmation to this email' : 'Your account email'}
                </small>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>First Name *</label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Last Name *</label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Mobile Number *</label>
                <input
                  type="tel"
                  name="mobileNumber"
                  value={formData.mobileNumber}
                  onChange={handleChange}
                  placeholder="01XXXXXXXXX"
                  required
                />
              </div>

              <div className="form-group">
                <label>Street Address *</label>
                <input
                  type="text"
                  name="streetAddress"
                  value={formData.streetAddress}
                  onChange={handleChange}
                  placeholder="House, Road, Area"
                  required
                />
              </div>

              <div className="form-group">
                <label>Country *</label>
                <select
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  required
                >
                  <option value="Bangladesh">Bangladesh</option>
                </select>
              </div>

              <div className="form-group">
                <label>District/State *</label>
                <select
                  name="district"
                  value={formData.district}
                  onChange={handleDistrictChange}
                  required
                >
                  <option value="">Select District</option>
                  <option value="Cox's Bazar">Cox's Bazar</option>
                  <option value="Dhaka">Dhaka</option>
                  <option value="Chattogram">Chattogram</option>
                  <option value="Rajshahi">Rajshahi</option>
                  <option value="Khulna">Khulna</option>
                  <option value="Barishal">Barishal</option>
                  <option value="Sylhet">Sylhet</option>
                  <option value="Rangpur">Rangpur</option>
                  <option value="Mymensingh">Mymensingh</option>
                </select>
                <small className="field-hint">Delivery charge is based on district.</small>
              </div>

              <div className="form-group">
                <label>City/Area *</label>
                <select
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select city or area</option>
                  <option value="Cox's Bazar">Cox's Bazar</option>
                  <option value="Dhaka">Dhaka</option>
                  <option value="Chattogram">Chattogram</option>
                  <option value="Rajshahi">Rajshahi</option>
                  <option value="Khulna">Khulna</option>
                  <option value="Barishal">Barishal</option>
                  <option value="Sylhet">Sylhet</option>
                  <option value="Rangpur">Rangpur</option>
                  <option value="Mymensingh">Mymensingh</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label>Zip/Postal Code *</label>
                <input
                  type="text"
                  name="zipCode"
                  value={formData.zipCode}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="payment-section">
                <h3>Payment Method</h3>
                <div className="payment-options">
                  <label className={`payment-option ${formData.paymentMethod === 'Cash on Delivery' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="Cash on Delivery"
                      checked={formData.paymentMethod === 'Cash on Delivery'}
                      onChange={handleChange}
                    />
                    <span>Cash on Delivery</span>
                  </label>
                  <label className={`payment-option ${formData.paymentMethod === 'bKash' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="bKash"
                      checked={formData.paymentMethod === 'bKash'}
                      onChange={handleChange}
                    />
                    <span>bKash</span>
                  </label>
                  <label className={`payment-option ${formData.paymentMethod === 'Bank Transfer' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="Bank Transfer"
                      checked={formData.paymentMethod === 'Bank Transfer'}
                      onChange={handleChange}
                    />
                    <span>Bank Transfer</span>
                  </label>
                  <label className={`payment-option ${formData.paymentMethod === 'Nagad' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="Nagad"
                      checked={formData.paymentMethod === 'Nagad'}
                      onChange={handleChange}
                    />
                    <span>Nagad</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="order-review-section">
              <h2>ORDER REVIEW</h2>

              <div className="order-items">
                {cartItems.map((item, index) => {
                  // ✅ Use getString and getNumber safely
                  const productName = getString(item.product?.name || item.name || 'Product');
                  const productPrice = getNumber(item.product?.basePrice) || getNumber(item.product?.price) || getNumber(item.price) || 0;
                  const productQty = item.quantity || 1;
                  const productDetails = getString(item.product?.description || item.details || '');

                  return (
                    <div key={index} className="order-item">
                      <div className="order-item-info">
                        <div className="order-item-name">{productName}</div>
                        {productDetails && <div className="order-item-details">{productDetails}</div>}
                        <div className="order-item-quantity">Quantity: {productQty}</div>
                      </div>
                      <div className="order-item-price">Tk {productPrice.toFixed(2)}</div>
                    </div>
                  );
                })}
              </div>

              <div className="order-summary">
                <div className="summary-row">
                  <span>SUBTOTAL</span>
                  <span>Tk {subtotal.toFixed(2)}</span>
                </div>
                <div className="summary-row">
                  <span>SHIPPING</span>
                  <span>{formData.deliveryCharge > 0 ? `Tk ${formData.deliveryCharge.toFixed(2)}` : 'Not yet calculated'}</span>
                </div>
                <div className="summary-row">
                  <span>VAT</span>
                  <span>Tk {vat.toFixed(2)}</span>
                </div>
                <div className="summary-row total">
                  <span>TOTAL</span>
                  <span>Tk {(subtotal + vat + formData.deliveryCharge).toFixed(2)}</span>
                </div>
              </div>

              <button type="submit" className="place-order-btn" disabled={loading}>
                {loading ? 'Processing...' : '🛒 PLACE ORDER'}
              </button>

              {isGuest && (
                <p className="guest-note">
                  🔒 You are ordering as a guest. <br />
                  <span className="guest-note-small">
                    Save your Order ID from the confirmation page — you can look up your order anytime at{" "}
                    <Link to="/track-order">Track Order</Link>, no account needed.
                  </span>
                </p>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Checkout;