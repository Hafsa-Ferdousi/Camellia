# Camellia E-commerce Platform — Project Development Plan

Based on: Project Summary Report (CSE412, Group 09) — User Stories, Use Case Diagram, Architecture Diagram

---

## 1. Stack (Decided)

**Frontend:** React | **Backend:** Express.js (Node) | **Database:** MongoDB

---

## 2. Feature List (Mapped from Your User Stories)

| # | Feature | Source US | Priority |
|---|---------|-----------|----------|
| 1 | User registration/login (customer + admin) | Required by US-03, US-04 | High |
| 2 | Product browsing (homepage, categories) | US-01 | High |
| 3 | Shopping cart (add/update/remove, persistent) | US-02 | High |
| 4 | Checkout + delivery info | US-03 | High |
| 5 | Payment (COD, Bkash, Nagad, bank) | US-04 | High |
| 6 | Product search & filter (name, category, price, color) | US-05 | Medium |
| 7 | Multi-language support (EN/BN/HI) | US-06 | Medium |
| 8 | Admin: product & inventory management | US-07 | High |
| 9 | Admin: category management | US-08 | Medium |
| 10 | Order tracking (status updates) | US-09 | High |

---

## 3. Database Design (MongoDB — Core Collections)

```
users        { username, name, email, password, phone, role, addresses[], preferredLanguage }
categories   { name: {en, bn}, slug, isFixed, sortOrder, image }
products     { name: {en, bn}, description: {en, bn}, category (ref), basePrice,
               images[], variants: [{color, size, sku, price, stock}], totalStock, isActive }
cartItems    { user (ref), product (ref), variantSku, quantity }
orders       { user (ref), address {addressLine, city, phone}, items: [{product, nameSnapshot,
               variantSku, quantity, price}], status, subtotal, deliveryCharge, totalAmount,
               payment: {method, status, transactionId, amount} }
```

This directly matches your Architecture Diagram's "Main Database" block (User detail, Product details, Order detail, Payment details) — payment is embedded inside each order document rather than a separate table, which fits MongoDB's document model better than a relational join.

---

## 4. Development Phases & Timeline

Assuming a ~6-7 week build window typical for a semester project.

### Phase 0 — Setup (Week 1)
- Finalize stack decision (team discussion)
- Set up MySQL database + schema (tables above)
- Set up backend project (folder structure, DB connection, `.env`)
- Set up frontend project (routing skeleton, pages list)
- Set up GitHub repo, branch strategy (`main`, `dev`, feature branches per member)
- **Output:** Empty-but-running frontend + backend, connected to MySQL

### Phase 1 — Auth + Core Catalog (Week 2)
- User registration/login (JWT-based), password hashing
- Category model + seed fixed categories (Bridal, General, etc.)
- Product model + admin "add product" endpoint
- Homepage: list products, browse by category
- **Output:** Can register/login, admin can add products, customers can browse them

### Phase 2 — Cart + Search/Filter (Week 3)
- Shopping cart (add/update/remove, persists per logged-in user)
- Product search by name
- Filter by category, price range, color
- **Output:** Customers can find products and build a cart

### Phase 3 — Checkout + Payment (Week 4)
- Delivery address form + validation
- Order creation logic (cart → order)
- Payment method selection: COD first (simplest), then Bkash/Nagad sandbox integration
- Order confirmation (email/SMS optional — can mock for demo)
- **Output:** Full purchase flow works end-to-end with at least COD

### Phase 4 — Admin Panel + Order Tracking (Week 5)
- Admin dashboard: manage products, stock, categories
- Admin: view/update order status (Pending → Confirmed → Processing → Shipped → Delivered)
- Customer: order tracking page showing current status
- **Output:** Admin can run the store; customers can track orders

### Phase 5 — Multi-language + Polish (Week 6)
- Language switcher (EN/BN/HI), store preference
- Translate UI strings + product fields (already multilingual in schema)
- Responsive design pass (mobile-friendly)
- Bug fixes, edge cases (empty cart, out-of-stock handling)
- **Output:** Feature-complete per your report's scope

### Phase 6 — Testing + Deployment + Report (Week 7)
- Manual testing against each User Story's Acceptance Criteria
- Deploy: frontend (Vercel/Netlify), backend (Render/Railway), MySQL (PlanetScale/Railway/Aiven)
- Finalize project report (add Implementation, Testing, Conclusion chapters)
- Prepare demo/presentation
- **Output:** Live deployed link + completed report + demo-ready

---

## 5. Suggested Team Split (4 Members)

Adjust based on actual skills/interest:

| Member | Focus Area |
|---|---|
| Member 1 | Backend: Auth, Users, Admin APIs |
| Member 2 | Backend: Products, Cart, Orders, Payment logic |
| Member 3 | Frontend: Customer-facing pages (browse, cart, checkout) |
| Member 4 | Frontend: Admin dashboard + multi-language + styling |

Everyone should be able to run the full stack locally (frontend + backend + MySQL) even if focused on one side, since debugging often crosses boundaries.

---

## 6. Risks Already Flagged in Your Report (Carry Forward)

- Payment gateway approval (Bkash/Nagad merchant accounts) can take time → **build COD first, treat online payment as stretch goal**
- Multilingual content entry doubles/triples admin data-entry work → **start with EN, add BN/HI fields once core flow works**
- Category structure changes mid-project → **lock category list early with the client (Camellia owner)**

---

## 7. Next Steps

1. Team discussion → finalize stack (this week)
2. I scaffold the chosen stack fully (models, routes/APIs, basic pages)
3. Start Phase 0 together
