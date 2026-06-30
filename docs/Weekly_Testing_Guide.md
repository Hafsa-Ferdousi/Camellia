# Camellia — Weekly Build & Test Guide

This tells you exactly what to **build**, and more importantly how to **check it's actually working**, week by week. Tied to `docs/Project_Plan.md`. Stack: React + Express + MongoDB.

General rule for the whole semester: **you always need 2 things running to test anything:**
1. Backend: `npm run dev` (in `backend/`) → http://localhost:5000
2. Frontend: `npm run dev` (in `frontend/`) → http://localhost:5173

If something feels broken, check both terminals for red error text first.

---

## Week 1 — Setup

**Do:**
- Install MongoDB locally, or create a free MongoDB Atlas cluster
- Run backend setup (see README.md)
- Run frontend setup (see README.md)

**How to check it's working:**
1. Run `npm run dev` in `backend/`. ✅ Pass = terminal shows `MongoDB connected: ...` and `Server running on http://localhost:5000`
2. Visit `http://localhost:5000` in browser. ✅ Pass = you see the text "Camellia API is running"
3. Run `npm run dev` in `frontend/`. ✅ Pass = terminal shows a `localhost:5173` link
4. Visit `http://localhost:5173`. ✅ Pass = you see "Camellia Jewelry" heading (even with no products yet)

If any of these fail, **stop and fix it before moving to Week 2** — every later week depends on this.

---

## Week 2 — Auth + Catalog

**Do:**
- Register a test user via the API or your Register page
- Add 1-2 categories and 2-3 products via Postman (since there's no admin panel built-in yet — that's a frontend task for later)
- Manually promote one user to admin in MongoDB Compass

**How to check it's working:**
1. POST to `http://localhost:5000/api/auth/register` with `{username, name, email, password}`. ✅ Pass = returns a user object + token, no error.
2. POST to `http://localhost:5000/api/auth/login` with the same credentials. ✅ Pass = returns a token.
3. In MongoDB Compass, open the `camellia` database → `categories` collection, manually insert a category document, OR use Postman with your admin's token to POST to `/api/categories`. ✅ Pass = appears when you GET `/api/categories`.
4. Same for a product via POST `/api/products`. ✅ Pass = appears when you GET `/api/products`.
5. Visit `http://localhost:5173`. ✅ Pass = your product(s) now appear on the homepage as cards.

**Red flag to watch for:** if products show via Postman/GET but NOT on the React homepage — that's a frontend bug (check browser console for errors), not a backend bug.

---

## Week 3 — Cart + Search/Filter

**Do:**
- Build/test the Cart page (add to cart button on product cards)
- Test search bar and category filter on homepage (already wired in code)

**How to check it's working:**
1. Log in as a test customer. Click "Add to Cart" on a product. ✅ Pass = `http://localhost:5000/api/cart` (with your token in the Authorization header) shows that item.
2. Type a product name in the search box on the homepage. ✅ Pass = list narrows to matching products only.
3. Click a category filter button. ✅ Pass = only that category's products show.
4. Try search + category filter together. ✅ Pass = both apply at once (matches your "multiple filters work simultaneously" requirement).

**Red flag:** if cart adds the same product twice instead of increasing quantity — check the unique index logic in the `CartItem` model.

---

## Week 4 — Checkout + Payment (COD first)

**Do:**
- Build a checkout page: address form + "Place Order" button
- Test with Cash on Delivery only (skip Bkash/Nagad for now — that's a stretch goal)

**How to check it's working:**
1. With items in cart, hit "Place Order" → calls `/api/orders/checkout` with `{ address, paymentMethod: "cod" }`. ✅ Pass = response returns an Order object with status `"pending"`.
2. Check `/api/orders` (with your token). ✅ Pass = the new order appears with correct items and total.
3. Check the product's stock via GET `/api/products/:id`. ✅ Pass = stock number went **down** by the quantity ordered.
4. Check the cart again (`/api/cart`). ✅ Pass = it's now empty (cart should clear after checkout).

**Red flag:** if stock doesn't decrease, or cart doesn't clear — checkout logic isn't completing properly. Check the backend terminal for an error message — checkout returns a clear error if something fails (e.g. "Not enough stock for...").

---

## Week 5 — Admin Panel + Order Tracking

**Do:**
- Build a simple Admin page in React (list products/orders, edit stock, change order status) — since MERN has no auto-admin like Django did
- Build the "My Orders" / order tracking page for customers

**How to check it's working:**
1. As admin, PATCH `/api/orders/:id/status` with `{ "status": "confirmed" }`. ✅ Pass = saves successfully.
2. As the customer who placed it, visit `/api/orders` (or your tracking page). ✅ Pass = status shows "Confirmed", not "Pending".
3. Try deleting a category with `isFixed: true` via `/api/categories/:id`. ✅ Pass = should return an error "Fixed categories cannot be deleted." (per US-08).

---

## Week 6 — Multi-language + Polish

**Do:**
- Build language switcher (EN/BN) on frontend
- Make sure Bengali text displays correctly (not broken/garbled characters)

**How to check it's working:**
1. Add a product with Bengali text in the `name.bn` field. ✅ Pass = saves and displays correctly when fetched via API (MongoDB stores Unicode natively, so this should just work — no special charset config needed, unlike MySQL).
2. Switch language toggle on frontend. ✅ Pass = product names switch from `name.en` to `name.bn` instantly, no page reload.
3. Refresh the page after switching language. ✅ Pass = it remembers your language choice (per US-06 requirement).
4. Resize your browser to mobile width / test on your phone. ✅ Pass = layout doesn't break (per your Usability non-functional requirement).

---

## Week 7 — Testing + Deployment

**Do:**
- Go through every User Story's Acceptance Criteria one by one, manually, and tick them off
- Deploy (or prepare local demo if deployment is out of scope)
  - Suggested: frontend → Vercel/Netlify, backend → Render/Railway, database → MongoDB Atlas (free tier)

**How to check everything is working (final checklist):**
- [ ] US-01: Homepage shows products with images/prices, browsable by category
- [ ] US-02: Cart add/update/remove + correct subtotal/total
- [ ] US-03: Checkout creates an order, confirmation shown
- [ ] US-04: At least COD payment works end-to-end (Bkash/Nagad = bonus if time allows)
- [ ] US-05: Search + filter (category, price, color) all work, including combined
- [ ] US-06: Language switch works and persists
- [ ] US-07: Admin can add/edit products, upload images, manage stock
- [ ] US-08: Admin can manage categories; fixed categories can't be deleted
- [ ] US-09: Customer can see order status update through all stages

If every box is checked using real clicks in the browser (not just "the code exists") — you're done.

---

## Quick reference: how to tell backend vs frontend is broken

| Symptom | Likely cause |
|---|---|
| White screen / React error in browser console | Frontend bug |
| `http://localhost:5000/api/...` shows error JSON | Backend bug |
| Data exists in MongoDB but not on website | Frontend not calling/reading API correctly |
| `400`/`500` error in browser Network tab | Backend bug — check Express terminal for the actual error |
| "CORS error" in browser console | Backend `cors()` middleware/config issue |
| "jwt malformed" or 401 errors | Token not being sent or expired — check `localStorage.getItem("token")` |
