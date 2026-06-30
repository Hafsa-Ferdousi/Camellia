// frontend/src/pages/OrderConfirmation.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import './Checkout.css';

const OrderConfirmation = () => {
  const orderNumber = Math.floor(Math.random() * 1000000);

  return (
    <div className="confirmation-container">
      <h1>✅ Order Confirmed!</h1>
      <p>Thank you for your purchase!</p>
      <div className="order-details">
        <h3>Order #: {orderNumber}</h3>
        <p>Your order has been placed successfully.</p>
        <p>We'll send you a confirmation email shortly.</p>
      </div>
      <Link to="/">
        <button>Continue Shopping</button>
      </Link>
    </div>
  );
};

export default OrderConfirmation;