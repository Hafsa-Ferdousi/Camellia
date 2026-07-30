// frontend/src/pages/Checkout.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShoppingCart, Lock, CheckCircle2, AlertTriangle } from 'lucide-react';
import './Checkout.css';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { localized } from '../utils/localized';
import { formatPrice } from '../utils/formatPrice';
import { checkout as checkoutApi, guestCheckout as guestCheckoutApi } from '../api/cart';
import { getPricing } from '../api/settings';
import { validateCoupon } from '../api/coupons';
import { districts } from '../data/districts';
import { cityMap } from '../data/cities';

const PAYMENT_METHOD_MAP = {
  'Cash on Delivery': 'cod',
  'bKash': 'bkash',
  'Nagad': 'nagad',
  'Bank Transfer': 'bank',
};

// ===== HELPERS =====
const getString = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value.en) return value.en;
  if (typeof value === 'object' && value.bn) return value.bn;
  return JSON.stringify(value);
};

const getNumber = (value) => {
  if (value === undefined || value === null) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  if (typeof value === 'object') {
    if (value.en !== undefined) return getNumber(value.en);
    if (value.bn !== undefined) return getNumber(value.bn);
    if (value.amount !== undefined) return getNumber(value.amount);
    if (value.value !== undefined) return getNumber(value.value);
  }
  return 0;
};

// ===== SEARCHABLE CITY DROPDOWN =====
const SearchableCityDropdown = ({ selectedDistrict, selectedCity, onChange, required }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCities, setFilteredCities] = useState([]);
  const dropdownRef = useRef(null);

  const cityOptions = selectedDistrict ? (cityMap[selectedDistrict] || []) : [];

  useEffect(() => {
    setSearchTerm('');
    setIsOpen(false);
    if (selectedCity && !cityOptions.includes(selectedCity)) {
      onChange({ target: { name: 'city', value: '' } });
    }
  }, [selectedDistrict]);

  useEffect(() => {
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      setFilteredCities(cityOptions.filter(city => city.toLowerCase().includes(term)));
    } else {
      setFilteredCities(cityOptions);
    }
  }, [searchTerm, cityOptions]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (city) => {
    onChange({ target: { name: 'city', value: city } });
    setSearchTerm(city);
    setIsOpen(false);
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    onChange({ target: { name: 'city', value } });
  };

  const handleFocus = () => {
    if (selectedDistrict) {
      setIsOpen(true);
      setFilteredCities(cityOptions);
    }
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
      <input
        type="text"
        placeholder={selectedDistrict ? 'Type city name or select from list...' : 'Select a district first'}
        value={searchTerm || selectedCity || ''}
        onChange={handleInputChange}
        onFocus={handleFocus}
        disabled={!selectedDistrict}
        required={required && selectedDistrict}
        style={{
          width: '100%',
          padding: '10px 14px',
          border: '1px solid #ddd',
          borderRadius: '6px',
          fontSize: '14px',
          background: selectedDistrict ? '#fff' : '#f5f5f5',
          boxSizing: 'border-box',
          outline: 'none',
        }}
      />
      {isOpen && selectedDistrict && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 2px)',
            left: 0,
            right: 0,
            background: '#fff',
            border: '1px solid #ddd',
            borderRadius: '6px',
            maxHeight: '200px',
            overflowY: 'auto',
            zIndex: 1000,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          }}
        >
          {filteredCities.length > 0 ? (
            filteredCities.map((city) => (
              <div
                key={city}
                onClick={() => handleSelect(city)}
                style={{
                  padding: '8px 14px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #f0ebe5',
                  transition: 'background 0.15s',
                  fontSize: '14px',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f8f5f0'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
              >
                {city}
              </div>
            ))
          ) : searchTerm.trim() ? (
            <div style={{ padding: '10px 14px', color: '#666', fontSize: '14px', borderBottom: '1px solid #f0ebe5' }}>
              No matches found for "<strong>{searchTerm}</strong>".<br />
              <span style={{ color: '#c9a84c', fontSize: '13px' }}>
                ✅ You can type any city name – it will be saved.
              </span>
            </div>
          ) : (
            <div style={{ padding: '10px 14px', color: '#999', fontSize: '14px' }}>
              No cities listed for this district. Type your city name above.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ===== MAIN CHECKOUT COMPONENT =====
const Checkout = () => {
  const { t } = useTranslation('checkout');
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { items: cartItems, clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isGuest, setIsGuest] = useState(false);

  // Coupon state
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [toast, setToast] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(null), 3000);
  };

  const [pricing, setPricing] = useState({
    vatRate: 0.10,
    defaultDeliveryCharge: 150,
    districtDeliveryCharges: [{ district: "Cox's Bazar", charge: 70 }]
  });

  useEffect(() => {
    getPricing().then(({ data }) => setPricing(data)).catch(() => {});
  }, []);

  const deliveryCharges = {
    ...Object.fromEntries(pricing.districtDeliveryCharges.map(d => [d.district, d.charge])),
    default: pricing.defaultDeliveryCharge,
  };

  const calculateTotals = () => {
    const subtotal = cartItems.reduce((sum, item) => {
      const price = getNumber(item.product?.basePrice) || getNumber(item.product?.price) || getNumber(item.price) || 0;
      const qty = item.quantity || 1;
      return sum + (price * qty);
    }, 0);
    const vat = subtotal * pricing.vatRate;
    return { subtotal, vat };
  };

  const { subtotal, vat } = calculateTotals();
  const discount = appliedCoupon?.discount || 0;

  const cartSignature = cartItems.map(i => `${i.productId || i.product?._id}:${i.quantity}`).join('|');
  useEffect(() => {
    if (appliedCoupon) {
      setAppliedCoupon(null);
      setCouponError('');
    }
  }, [cartSignature]);

  const handleApplyCoupon = async () => {
    const code = couponInput.trim();
    if (!code) return;
    setCouponLoading(true);
    setCouponError('');
    try {
      const items = cartItems.map((item) => ({
        product: item.productId || item.product?._id,
        category: item.product?.category?._id || item.product?.category,
      }));
      const { data } = await validateCoupon(code, subtotal, items, isGuest ? formData.email : undefined);
      setAppliedCoupon({ code: data.coupon, discount: data.discount, newTotal: data.newTotal });
      showToast('success', data.message || t('couponAppliedSuccess'));
    } catch (err) {
      setAppliedCoupon(null);
      const msg = err.response?.data?.message || t('couponApplyFailed');
      setCouponError(msg);
      showToast('error', msg);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponError('');
  };

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

  useEffect(() => {
    if (!user) {
      setIsGuest(true);
    }
  }, [user]);

  const handleDistrictChange = (e) => {
    const district = e.target.value;
    const charge = deliveryCharges[district] || deliveryCharges['default'];
    setFormData({
      ...formData,
      district: district,
      deliveryCharge: charge,
      city: '',
      total: subtotal + vat + charge
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
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
      },
      appliedCoupon?.code
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
      paymentMethod,
      appliedCoupon?.code
    );
    return order;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const order = user ? await submitLoggedInOrder() : await submitGuestOrder();

      clearCart();
      navigate('/order-confirmation', { state: { order } });
    } catch (err) {
      setError(err.response?.data?.message || err.message || t('orderFailed'));
    } finally {
      setLoading(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="checkout-page">
        <div className="checkout-container">
          <h1 className="checkout-title">{t('title')}</h1>
          <p className="checkout-subtitle">{t('subtitle')}</p>
          <div className="empty-cart-message" style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, opacity: 0.5 }}><ShoppingCart size={32} /></div>
            <h2>{t('emptyCart')}</h2>
            <p style={{ color: '#888', marginBottom: 20 }}>{t('emptyCartSub')}</p>
            <button className="auth-submit-btn" onClick={() => navigate('/products')} style={{ padding: '12px 30px' }}>{t('browseProducts')}</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      {toast && (
        <div className={`checkout-toast checkout-toast-${toast.type}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {toast.type === 'success' ? <CheckCircle2 size={16} strokeWidth={2} /> : <AlertTriangle size={16} strokeWidth={2} />}
          {toast.message}
        </div>
      )}
      <div className="checkout-container">
        <h1 className="checkout-title">{t('title')}</h1>
        <p className="checkout-subtitle">{t('subtitle')}</p>

        {error && <div className="error-message">{error}</div>}

        <div className={`user-info-bar ${isGuest ? 'guest-mode' : ''}`}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {!user && <ShoppingCart size={14} />} {user ? t('welcome', { name: user.name?.split(' ')[0] || 'User' }) : t('checkingOutAsGuest')}
          </span>
          <div>
            {isGuest && (
              <Link to="/login" state={{ from: '/checkout' }} className="login-link">
                {t('loginInstead')}
              </Link>
            )}
            {user && (
              <button className="logout-btn" onClick={async () => { await logout(); navigate('/login', { state: { from: '/checkout' } }); }}>
                {t('logout')}
              </button>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="checkout-form">
          <div className="checkout-grid">
            <div className="shipping-section">
              <h2>{t('shippingAddress')}</h2>

              <div className="form-group">
                <label>{t('emailAddress')}</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder={t('emailPlaceholder')}
                  required
                />
                <small className="field-hint">
                  {isGuest ? t('guestEmailHint') : t('accountEmailHint')}
                </small>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>{t('firstName')} <span style={{ color: '#c62828' }}>*</span></label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>{t('lastName')} <span style={{ color: '#999', fontSize: '12px' }}>(optional)</span></label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    // ✅ required removed – last name is optional
                  />
                </div>
              </div>

              <div className="form-group">
                <label>{t('mobileNumber')}</label>
                <input
                  type="tel"
                  name="mobileNumber"
                  value={formData.mobileNumber}
                  onChange={handleChange}
                  placeholder={t('phonePlaceholder')}
                  required
                />
              </div>

              <div className="form-group">
                <label>{t('streetAddress')}</label>
                <input
                  type="text"
                  name="streetAddress"
                  value={formData.streetAddress}
                  onChange={handleChange}
                  placeholder={t('addressPlaceholder')}
                  required
                />
              </div>

              <div className="form-group">
                <label>{t('country')}</label>
                <select
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  required
                >
                  <option value="Bangladesh">{t('bangladesh')}</option>
                </select>
              </div>

              {/* ✅ DISTRICT – ALL 64 DISTRICTS (SORTED A-Z) */}
              <div className="form-group">
                <label>{t('district')}</label>
                <select
                  name="district"
                  value={formData.district}
                  onChange={handleDistrictChange}
                  required
                >
                  <option value="">{t('selectDistrict')}</option>
                  {districts.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <small className="field-hint">{t('districtHint')}</small>
              </div>

              {/* ✅ CITY – SEARCHABLE DROPDOWN */}
              <div className="form-group">
                <label>{t('city')}</label>
                <SearchableCityDropdown
                  selectedDistrict={formData.district}
                  selectedCity={formData.city}
                  onChange={handleChange}
                  required={true}
                />
                <small className="field-hint">Type the name of your city or select from the list.</small>
              </div>

              <div className="form-group">
                <label>{t('zipCode')}</label>
                <input
                  type="text"
                  name="zipCode"
                  value={formData.zipCode}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="payment-section">
                <h3>{t('paymentMethod')}</h3>
                <div className="payment-options">
                  <label className={`payment-option ${formData.paymentMethod === 'Cash on Delivery' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="Cash on Delivery"
                      checked={formData.paymentMethod === 'Cash on Delivery'}
                      onChange={handleChange}
                    />
                    <span>{t('cashOnDelivery')}</span>
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
                    <span>{t('bankTransfer')}</span>
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
              <h2>{t('orderReview')}</h2>

              <div className="order-items">
                {cartItems.map((item, index) => {
                  const productName = localized(item.product?.name, language) || getString(item.name || t('productFallback'));
                  const productPrice = getNumber(item.product?.basePrice) || getNumber(item.product?.price) || getNumber(item.price) || 0;
                  const productQty = item.quantity || 1;
                  const productDetails = localized(item.product?.description, language) || getString(item.details || '');
                  const productImage = item.product?.images?.[0] || item.image || '';

                  return (
                    <div key={index} className="order-item">
                      <div className="order-item-info" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {productImage ? (
                          <img
                            src={productImage}
                            alt={productName}
                            style={{
                              width: '50px',
                              height: '50px',
                              objectFit: 'cover',
                              borderRadius: '4px',
                              border: '1px solid #f0ebe5'
                            }}
                          />
                        ) : (
                          <div style={{
                            width: '50px',
                            height: '50px',
                            background: '#f8f5f0',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '20px',
                            color: '#ccc'
                          }}>
                            💍
                          </div>
                        )}
                        <div>
                          <div className="order-item-name">{productName}</div>
                          {productDetails && <div className="order-item-details">{productDetails}</div>}
                          <div className="order-item-quantity">{t('quantity', { count: productQty })}</div>
                        </div>
                      </div>
                      <div className="order-item-price">৳ {formatPrice(productPrice, language, 2)}</div>
                    </div>
                  );
                })}
              </div>

              {/* ✅ COUPON SECTION – RESTORED */}
              <div className="coupon-section">
                <label className="coupon-label">{t('couponCode')}</label>
                {!appliedCoupon ? (
                  <div className="coupon-input-row">
                    <input
                      type="text"
                      className="coupon-input"
                      placeholder={t('enterCouponCode')}
                      value={couponInput}
                      onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError(''); }}
                      disabled={couponLoading}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleApplyCoupon(); } }}
                    />
                    <button
                      type="button"
                      className="coupon-apply-btn"
                      onClick={handleApplyCoupon}
                      disabled={couponLoading || !couponInput.trim()}
                    >
                      {couponLoading ? <span className="coupon-spinner" /> : t('applyCoupon')}
                    </button>
                  </div>
                ) : (
                  <div className="coupon-applied-box">
                    <div className="coupon-applied-info">
                      <span className="coupon-applied-check" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><CheckCircle2 size={14} strokeWidth={2} /> {t('couponApplied')}</span>
                      <span className="coupon-applied-code">{t('couponLabel', { code: appliedCoupon.code })}</span>
                    </div>
                    <button type="button" className="coupon-remove-btn" onClick={handleRemoveCoupon}>
                      {t('remove')}
                    </button>
                  </div>
                )}
                {couponError && <div className="coupon-error">{couponError}</div>}
              </div>

              <div className="order-summary">
                <div className="summary-row">
                  <span>{t('subtotal')}</span>
                  <span>৳ {formatPrice(subtotal, language, 2)}</span>
                </div>
                <div className="summary-row">
                  <span>{t('shipping')}</span>
                  <span>{formData.deliveryCharge > 0 ? `৳ ${formatPrice(formData.deliveryCharge, language, 2)}` : t('notYetCalculated')}</span>
                </div>
                <div className="summary-row">
                  <span>{t('vat')}</span>
                  <span>৳ {formatPrice(vat, language, 2)}</span>
                </div>
                {discount > 0 && (
                  <div className="summary-row discount-row">
                    <span>{t('discountLabel', { code: appliedCoupon.code })}</span>
                    <span>- ৳ {formatPrice(discount, language, 2)}</span>
                  </div>
                )}
                <div className="summary-row total">
                  <span>{t('total')}</span>
                  <span>৳ {formatPrice(Math.max(0, subtotal + vat + formData.deliveryCharge - discount), language, 2)}</span>
                </div>
              </div>

              <button type="submit" className="place-order-btn" disabled={loading} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {loading ? t('processing') : <><ShoppingCart size={16} /> {t('placeOrder')}</>}
              </button>

              {!user && (
                <p className="guest-note">
                  <Lock size={12} style={{ verticalAlign: '-1px' }} /> {t('guestNote')} <br />
                  <span className="guest-note-small">
                    {t('guestNoteSmall')}{" "}
                    <Link to="/track-order">{t('trackOrder')}</Link>{t('noAccountNeeded')}
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