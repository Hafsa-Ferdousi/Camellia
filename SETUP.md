# Camellia — Setup Guide

## Prerequisites
- Node.js 18+
- MongoDB (local) or MongoDB Atlas URI

---

## 1. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env and set your MONGO_URI and JWT_SECRET
node seed.js         # Populate DB with demo data
node server.js       # Start backend on http://localhost:5000
```

**Demo accounts after seed:**
- Admin: `admin@camellia.com` / `admin123`
- Customer: `hafsa@example.com` / `customer123`

---

## 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev          # Start on http://localhost:5173
```

The Vite proxy forwards `/api/*` → `http://localhost:5000/api/*` automatically.

---

## Bug Fixes Applied (35+ issues resolved)

### Backend
1. Cart controller — validates product exists before adding
2. Cart controller — checks stock before adding
3. Cart controller — returns populated item after add/update
4. Cart controller — validates quantity > 0 on update
5. Order controller — delivery charge was 0 (should be ৳80 for COD)
6. Order controller — address validation matches frontend fields
7. Order controller — guards against deleted products in cart
8. Order controller — COD gets ৳80 charge, online payment is free
9. Order controller — marks COD payment as "paid" on delivery
10. Product controller — isFeatured filter support added
11. Product controller — sort parameter support
12. Product controller — 404 for inactive products
13. Product controller — auto-computes totalStock from variants
14. Product controller — recomputes totalStock on update
15. Product controller — soft delete preserves order history
16. Product model — isFeatured field was missing
37. Admin product form — category field was missing from create/edit

### Frontend
17. Cart API — all endpoints were pointing to wrong routes/methods
18. Cart API — updateCartItem correctly uses cart item _id
19. Cart API — removeCartItem correctly uses cart item _id
20. Cart API — checkout correctly calls /orders/checkout
21. Cart page — price helper correctly reads variant SKU
22. Cart page — qty/remove pass cart item _id not product _id
23. Cart page — shows real delivery charge (৳80), not "Free"
24. Checkout page — delivery charge updates live per payment method
25. Checkout page — validates required fields before submit
26. Checkout page — requires transaction ID for online payments
27. Checkout page — address shape matches backend model
28. Checkout page — transaction ID input shown for online payment
29. OrderConfirmation — handles missing state gracefully
30. Orders page — cancelled orders skip the status tracker
31. Navbar — Products link scrolls to products section
32. ProductCard — totalStock read correctly, handles 0
33. ProductCard — shows basePrice correctly
34. Register — username field was missing (required by backend)
35. Login — shows success message after registration
36. Admin — /orders/all route called before /orders/:id
38. Admin — payment.method used correctly (not paymentMethod)
39. vite.config.js — proxy was missing
