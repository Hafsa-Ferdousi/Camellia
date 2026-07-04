// frontend/src/pages/Checkout.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Checkout.css';

// Helper to safely get string value from object or string
const getString = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value.en) return value.en;
  if (typeof value === 'object' && value.bn) return value.bn;
  return JSON.stringify(value);
};

// ✅ NEW: Helper to safely get a number from any price format
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isGuest, setIsGuest] = useState(false);

  const [cartItems, setCartItems] = useState([]);

  useEffect(() => {
    const savedCart = localStorage.getItem('camellia_guest_cart');
    if (savedCart) {
      try {
        const parsed = JSON.parse(savedCart);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCartItems(parsed);
        } else {
          setCartItems([]);
        }
      } catch (e) {
        setCartItems([]);
      }
    } else {
      setCartItems([]);
    }
  }, []);

  const deliveryCharges = {
    "Cox's Bazar": 80,
    'default': 150
  };

  const calculateTotals = () => {
    const subtotal = cartItems.reduce((sum, item) => {
      // ✅ Use getNumber to extract price safely
      const price = getNumber(item.product?.price) || getNumber(item.price) || 0;
      const qty = item.quantity || 1;
      return sum + (price * qty);
    }, 0);
    const vat = subtotal * 0.10;
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

  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const handleCityChange = (e) => {
    const city = e.target.value;
    const charge = deliveryCharges[city] || deliveryCharges['default'];
    setFormData({
      ...formData,
      city: city,
      deliveryCharge: charge,
      total: subtotal + vat + charge
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    setLoading(true);
    try {
      setIsLoggedIn(true);
      setShowLogin(false);
      setIsGuest(false);
      setFormData(prev => ({ ...prev, email: loginData.email }));
    } catch (err) {
      setAuthError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (registerData.password !== registerData.confirmPassword) {
      setAuthError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      setIsLoggedIn(true);
      setIsRegistering(false);
      setShowLogin(false);
      setIsGuest(false);
      setFormData(prev => ({
        ...prev,
        email: registerData.email,
        firstName: registerData.name.split(' ')[0] || '',
        lastName: registerData.name.split(' ').slice(1).join(' ') || ''
      }));
    } catch (err) {
      setAuthError('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestCheckout = () => {
    setIsGuest(true);
    setIsLoggedIn(false);
    setShowLogin(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { subtotal, vat } = calculateTotals();
      
      const orderItems = cartItems.map(item => ({
        nameSnapshot: getString(item.product?.name || item.name || 'Product'),
        quantity: item.quantity || 1,
        price: getNumber(item.product?.price) || getNumber(item.price) || 0,
        details: getString(item.product?.description || item.details || '')
      }));

      const orderData = {
        _id: 'ORD-' + Date.now(),
        items: orderItems,
        subtotal: subtotal,
        vat: vat,
        deliveryCharge: formData.deliveryCharge,
        totalAmount: subtotal + vat + formData.deliveryCharge,
        address: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.mobileNumber,
          streetAddress: formData.streetAddress,
          country: formData.country,
          district: formData.district,
          city: formData.city,
          zipCode: formData.zipCode
        },
        payment: {
          method: formData.paymentMethod === 'Cash on Delivery' ? 'cod' : formData.paymentMethod.toLowerCase()
        },
        createdAt: new Date().toISOString(),
        paymentMethod: formData.paymentMethod,
        isGuest: isGuest,
        isLoggedIn: isLoggedIn
      };

      const savedOrders = JSON.parse(localStorage.getItem('orders') || '[]');
      savedOrders.push(orderData);
      localStorage.setItem('orders', JSON.stringify(savedOrders));
      localStorage.removeItem('camellia_guest_cart');
      setCartItems([]);
      navigate('/order-confirmation', { state: { order: orderData } });
    } catch (err) {
      setError('Order failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const showAuthPrompt = !isLoggedIn && !isGuest;

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
        {authError && <div className="error-message">{authError}</div>}

        {showAuthPrompt ? (
          <div className="auth-section-top">
            <div className="auth-tabs">
              <button
                className={`auth-tab ${!isRegistering ? 'active' : ''}`}
                onClick={() => { setIsRegistering(false); setAuthError(''); }}
              >
                Login
              </button>
              <button
                className={`auth-tab ${isRegistering ? 'active' : ''}`}
                onClick={() => { setIsRegistering(true); setAuthError(''); }}
              >
                Register
              </button>
            </div>

            <div className="auth-form-top">
              {!isRegistering ? (
                <form onSubmit={handleLogin} className="auth-form-inline">
                  <div className="auth-row">
                    <div className="auth-field">
                      <input
                        type="email"
                        placeholder="Email Address"
                        value={loginData.email}
                        onChange={(e) => setLoginData({...loginData, email: e.target.value})}
                        required
                      />
                    </div>
                    <div className="auth-field">
                      <input
                        type="password"
                        placeholder="Password"
                        value={loginData.password}
                        onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                        required
                      />
                    </div>
                    <div className="auth-field auth-btn-field">
                      <button type="submit" disabled={loading} className="auth-submit-btn">
                        {loading ? 'Logging in...' : 'Login'}
                      </button>
                    </div>
                  </div>
                  <div className="auth-divider"><span>or</span></div>
                  <div className="auth-guest-option">
                    <button type="button" className="guest-link" onClick={handleGuestCheckout}>
                      🛒 Continue as Guest (No Login Required)
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleRegister} className="auth-form-inline">
                  <div className="auth-row">
                    <div className="auth-field">
                      <input
                        type="text"
                        placeholder="Full Name"
                        value={registerData.name}
                        onChange={(e) => setRegisterData({...registerData, name: e.target.value})}
                        required
                      />
                    </div>
                    <div className="auth-field">
                      <input
                        type="email"
                        placeholder="Email Address"
                        value={registerData.email}
                        onChange={(e) => setRegisterData({...registerData, email: e.target.value})}
                        required
                      />
                    </div>
                    <div className="auth-field">
                      <input
                        type="password"
                        placeholder="Password"
                        value={registerData.password}
                        onChange={(e) => setRegisterData({...registerData, password: e.target.value})}
                        required
                      />
                    </div>
                    <div className="auth-field">
                      <input
                        type="password"
                        placeholder="Confirm Password"
                        value={registerData.confirmPassword}
                        onChange={(e) => setRegisterData({...registerData, confirmPassword: e.target.value})}
                        required
                      />
                    </div>
                    <div className="auth-field auth-btn-field">
                      <button type="submit" disabled={loading} className="auth-submit-btn">
                        {loading ? 'Creating...' : 'Create Account'}
                      </button>
                    </div>
                  </div>
                  <div className="auth-divider"><span>or</span></div>
                  <div className="auth-guest-option">
                    <button type="button" className="guest-link" onClick={handleGuestCheckout}>
                      🛒 Continue as Guest (No Login Required)
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        ) : (
          <div className={`user-info-bar ${isGuest ? 'guest-mode' : ''}`}>
            <span>
              {isLoggedIn ? `👋 Welcome, ${formData.firstName || 'User'}!` : '🛒 You are checking out as a Guest'}
            </span>
            <div>
              {isGuest && (
                <button className="login-link" onClick={() => { setIsGuest(false); setShowLogin(true); setIsLoggedIn(false); }}>
                  Login instead?
                </button>
              )}
              <button className="logout-btn" onClick={() => {
                setIsLoggedIn(false);
                setIsGuest(false);
                setShowLogin(true);
                setFormData({ ...formData, email: '', firstName: '', lastName: '' });
              }}>
                {isGuest ? 'Switch to Login' : 'Logout'}
              </button>
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
                  onChange={handleChange}
                  required
                >
                  <option value="">Select District</option>
                  <option value="Dhaka">Dhaka</option>
                  <option value="Chattogram">Chattogram</option>
                  <option value="Rajshahi">Rajshahi</option>
                  <option value="Khulna">Khulna</option>
                  <option value="Barishal">Barishal</option>
                  <option value="Sylhet">Sylhet</option>
                  <option value="Rangpur">Rangpur</option>
                  <option value="Mymensingh">Mymensingh</option>
                </select>
              </div>

              <div className="form-group">
                <label>City/Area *</label>
                <select
                  name="city"
                  value={formData.city}
                  onChange={handleCityChange}
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
                  <label className={`payment-option ${formData.paymentMethod === 'Credit Card' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="Credit Card"
                      checked={formData.paymentMethod === 'Credit Card'}
                      onChange={handleChange}
                    />
                    <span>Credit / Debit Card</span>
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
                  const productPrice = getNumber(item.product?.price) || getNumber(item.price) || 0;
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
                  <span className="guest-note-small">Create an account after checkout to track your orders.</span>
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
