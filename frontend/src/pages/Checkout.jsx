// frontend/src/pages/Checkout.jsx
import React, { useState } from 'react';
import './Checkout.css';

const Checkout = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    address: '',
    city: '',
    zipCode: '',
    cardNumber: '',
    expiryDate: '',
    cvv: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Navigate to order confirmation page
    window.location.href = '/order-confirmation';
  };

  return (
    <div className="checkout-container">
      <h1>Checkout</h1>
      <form onSubmit={handleSubmit}>
        <h3>Shipping Information</h3>
        <input 
          name="fullName" 
          placeholder="Full Name" 
          onChange={handleChange} 
          required 
        />
        <input 
          name="email" 
          placeholder="Email" 
          type="email" 
          onChange={handleChange} 
          required 
        />
        <input 
          name="address" 
          placeholder="Address" 
          onChange={handleChange} 
          required 
        />
        <input 
          name="city" 
          placeholder="City" 
          onChange={handleChange} 
          required 
        />
        <input 
          name="zipCode" 
          placeholder="ZIP Code" 
          onChange={handleChange} 
          required 
        />

        <h3>Payment Information</h3>
        <input 
          name="cardNumber" 
          placeholder="Card Number" 
          onChange={handleChange} 
          required 
        />
        <input 
          name="expiryDate" 
          placeholder="MM/YY" 
          onChange={handleChange} 
          required 
        />
        <input 
          name="cvv" 
          placeholder="CVV" 
          type="password" 
          onChange={handleChange} 
          required 
        />

        <button type="submit">Place Order</button>
      </form>
    </div>
  );
};

export default Checkout;