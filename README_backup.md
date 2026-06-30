# Camellia — Jewelry E-commerce Platform

Stack: **React** (frontend) + **Express.js** (backend) + **MongoDB** (database)

---

## Project Structure

```
camellia/
├── backend/          # Express REST API
│   ├── config/       # MongoDB connection
│   ├── models/       # Mongoose schemas
│   ├── controllers/  # business logic
│   ├── routes/       # API endpoints
│   ├── middleware/   # JWT auth
│   ├── server.js
│   └── .env.example
├── frontend/         # React app (Vite)
│   ├── src/
│   │   ├── api/      # axios calls to backend
│   │   ├── pages/    # Home, Login, etc.
│   │   ├── components/
│   │   └── context/  # AuthContext
│   └── .env.example
└── docs/
    ├── Project_Plan.md
    ├── Weekly_Testing_Guide.md
    ├── Sprint1.md
    └── Sprint2.md
```

---

## Backend Setup (Express + MongoDB)

1. Install MongoDB locally (MongoDB Community Server), or use a free MongoDB Atlas cloud cluster — easier for a team since everyone shares one database without installing it locally.

2. Install dependencies:
   ```bash
   cd backend
   npm install
   ```

3. Copy `.env.example` to `.env` and fill in your MongoDB URI:
   ```bash
   cp .env.example .env
   ```
   - Local MongoDB: `MONGO_URI=mongodb://localhost:27017/camellia`
   - Atlas (cloud): paste your Atlas connection string instead

4. Run the server:
   ```bash
   npm run dev
   ```
   - API base: `http://localhost:5000/api/`
   - There is **no built-in admin panel** like Django had — you manage products/categories either:
     - through API calls directly (Postman), or
     - by building a simple Admin page in React (recommended — see Sprint plan)

5. Create your first admin user manually: register a normal user via `/api/auth/register`, then in MongoDB Compass (or `mongosh`), change that user's `role` field from `"customer"` to `"admin"`.

---

## Frontend Setup (React)

1. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```

2. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

3. Run the dev server:
   ```bash
   npm run dev
   ```
   - App: `http://localhost:5173`

**Run both backend and frontend at the same time, in two separate terminals.**

---

## Key API Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/auth/register` | POST | Customer registration |
| `/api/auth/login` | POST | Login, returns JWT token |
| `/api/auth/me` | GET | Current logged-in user |
| `/api/categories` | GET | List categories (anyone) |
| `/api/categories` | POST/PUT/DELETE | Manage categories (admin only) |
| `/api/products?search=&category=&minPrice=&maxPrice=&color=` | GET | Browse/search/filter products |
| `/api/products` | POST/PUT/DELETE | Manage products (admin only) |
| `/api/cart` | GET/POST | View/add to cart (login required) |
| `/api/cart/:id` | PATCH/DELETE | Update/remove cart item |
| `/api/orders/checkout` | POST | Place order from cart `{ address, paymentMethod }` |
| `/api/orders` | GET | View own orders (or all, if admin) |
| `/api/orders/:id/status` | PATCH | Admin: update order status |

---

## What's Already Built

- ✅ Mongoose models for all entities (User, Category, Product+Variants, CartItem, Order+Payment) — bilingual (en/bn) fields included
- ✅ JWT authentication (register/login/me)
- ✅ Product browsing, search, filter (by category/price/color)
- ✅ Cart management
- ✅ Checkout → Order creation logic (with stock deduction)
- ✅ Order status tracking + admin status updates
- ✅ React: routing, auth context, homepage with search/filter, login page

**Note on checkout:** the order logic does NOT use MongoDB transactions, because transactions require a replica set, which a standalone local MongoDB install doesn't have. This is fine for a class project. Be aware it means a crash mid-checkout could theoretically leave stock/cart slightly out of sync — acceptable here, just know the trade-off.

## What's Next (see docs/Project_Plan.md and docs/Sprint*.md)

- [ ] Cart page + checkout flow UI (React)
- [ ] Order tracking page UI
- [ ] A simple Admin UI (since there's no Django-style auto admin in this stack) — or use Postman/Compass for now
- [ ] Multi-language switcher (model fields already support en/bn)
- [ ] Payment gateway integration (Bkash/Nagad) — build COD first
- [ ] Image upload (Cloudinary or similar) — model fields ready, need upload endpoint
