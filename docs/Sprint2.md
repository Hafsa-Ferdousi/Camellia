# Sprint 2 — Frontend First (Auth + Catalog)
**Duration:** Week 2
**Goal:** Build the actual pages/UI first using fake/mock data, then connect them to the real Express + MongoDB backend.

**Why this order:** lets frontend-focused members work immediately without waiting on backend data entry; lets backend-focused members work on real data/API in parallel.

---

## Part A — Build Pages with Mock Data (no backend needed yet)

| # | Task | Owner | Done When |
|---|---|---|---|
| 1 | Build Register page UI (form: username, email, password) | _______ | Form renders, fields work, button does nothing yet (or just console.logs) |
| 2 | Polish Login page UI (already scaffolded — improve styling/layout) | _______ | Looks presentable, not just bare HTML inputs |
| 3 | Build homepage product grid using **hardcoded fake array** of 4-5 products (name, price, fake image URL) | _______ | Homepage shows fake product cards, looks like a real store |
| 4 | Build category filter buttons using a **hardcoded fake category list** | _______ | Clicking buttons visually highlights/selects (logic can be fake for now) |
| 5 | Add basic navbar styling (logo/title, nav links, login button) | _______ | Navbar looks clean across pages |

## Part B — Backend Prep (in parallel, different teammate)

| # | Task | Owner | Done When |
|---|---|---|---|
| 6 | Add 2-3 real categories via Postman (POST `/api/categories` with admin token) | _______ | Visible via GET `/api/categories` |
| 7 | Add 4-5 real products with prices, stock, images via Postman | _______ | Visible via GET `/api/products` |
| 8 | Test `/api/auth/register` and `/api/auth/login` work via Postman | _______ | Returns correct JSON (user + token), no errors |

## Part C — Connect Frontend to Backend (do this once A and B are both done)

| # | Task | Owner | Done When |
|---|---|---|---|
| 9 | Replace hardcoded product array with real `getProducts()` API call | _______ | Homepage shows real DB products instead of fake ones |
| 10 | Replace hardcoded categories with real `getCategories()` API call | _______ | Filter buttons use real categories, actually filter products |
| 11 | Wire Register form to call `/api/auth/register` | _______ | New user can register through the actual UI |
| 12 | Confirm Login page logs in a real registered user | _______ | Username shows in navbar, persists on refresh |

---

## Definition of Done for This Sprint
- [ ] Pages look like a real e-commerce site (not bare HTML)
- [ ] By end of week, fake data is fully replaced — homepage/categories pull from real backend
- [ ] At least one real user can register + login through the actual website

## Carry into Sprint 3
**Week 3: Cart + Search/Filter** — add-to-cart buttons, persistent cart, search bar, price/color filters — now built on top of real, connected data.
