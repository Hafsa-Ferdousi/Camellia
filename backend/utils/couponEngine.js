import Coupon from "../models/Coupon.js";

// Central place for every coupon business rule. Both the customer-facing
// "validate" endpoint and the checkout flow (which must re-validate a coupon
// server-side before it ever touches an order) call into this so the two
// can never drift out of sync.
//
// items (optional): [{ product: <id>, category: <id>, price, quantity }, ...]
// — the current cart lines, used to enforce applicableProducts/
// applicableCategories/excludedProducts. If omitted, product/category
// restrictions are skipped (used by lightweight "does this code exist and
// work at all" checks).
//
// A coupon only ever discounts the lines it's actually eligible for — e.g.
// a "SALE15" code scoped to Category A discounts only the Category A items
// in a mixed cart; the rest of the cart is untouched. price/quantity on each
// line let us compute that eligible subtotal; if they're omitted (older
// caller) we fall back to discounting the full cart total, same as before.
//
// identity: { userId, guestEmail } — whichever the caller has, used to
// enforce perUserLimit.
//
// Throws an Error with a customer-facing message on any failed rule.
// Returns { coupon, discount, newTotal, appliesToAllItems, eligibleProductIds }
// on success — appliesToAllItems is false when the discount only covered
// some of the cart's lines; eligibleProductIds (only set when items were
// passed) lists which product ids the discount actually applied to, so
// callers can show an item-by-item breakdown.
export async function findAndValidateCoupon({ code, cartTotal, items, userId, guestEmail }) {
  if (!code || !String(code).trim()) {
    throw new Error("Please enter a coupon code.");
  }
  const total = Number(cartTotal);
  if (!Number.isFinite(total) || total < 0) {
    throw new Error("Invalid cart total.");
  }

  const coupon = await Coupon.findOne({ code: String(code).trim().toUpperCase() });
  if (!coupon) {
    throw new Error("Coupon not found.");
  }

  if (!coupon.isActive) {
    throw new Error("This coupon is inactive.");
  }

  const now = new Date();
  if (now < coupon.startDate) {
    throw new Error("This coupon has not started yet.");
  }
  if (now > coupon.endDate) {
    throw new Error("This coupon has expired.");
  }

  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
    throw new Error("This coupon has reached its usage limit.");
  }

  if (coupon.perUserLimit != null) {
    const usage = coupon.usedBy.find((u) =>
      (userId && u.user && String(u.user) === String(userId)) ||
      (!userId && guestEmail && u.guestEmail && u.guestEmail.toLowerCase() === guestEmail.toLowerCase())
    );
    if (usage && usage.count >= coupon.perUserLimit) {
      throw new Error("You have already used this coupon the maximum number of times.");
    }
  }

  if (coupon.minimumPurchase && total < coupon.minimumPurchase) {
    throw new Error(`Minimum purchase is ৳${coupon.minimumPurchase}.`);
  }

  // Product/category restrictions — only enforced when the caller passed
  // the current cart lines. An item is eligible unless it's explicitly
  // excluded; if applicableProducts/applicableCategories are set, at least
  // one cart line must match one of them.
  let appliesToAllItems = true;
  let eligibleSubtotal = total;
  let eligibleProductIds = null;

  if (Array.isArray(items) && items.length > 0) {
    const hasProductScope = coupon.applicableProducts?.length > 0;
    const hasCategoryScope = coupon.applicableCategories?.length > 0;
    const excluded = new Set((coupon.excludedProducts || []).map((id) => String(id)));

    const eligibleItems = items.filter((line) => {
      const productId = line.product ? String(line.product) : null;
      const categoryId = line.category ? String(line.category) : null;
      if (productId && excluded.has(productId)) return false;
      if (!hasProductScope && !hasCategoryScope) return true;
      const productMatch = hasProductScope && productId &&
        coupon.applicableProducts.some((id) => String(id) === productId);
      const categoryMatch = hasCategoryScope && categoryId &&
        coupon.applicableCategories.some((id) => String(id) === categoryId);
      return productMatch || categoryMatch;
    });

    if (eligibleItems.length === 0) {
      // Every item in the cart is excluded / outside this coupon's scope.
      throw new Error("This coupon doesn't apply to any items in your cart.");
    }

    appliesToAllItems = eligibleItems.length === items.length;
    eligibleProductIds = eligibleItems
      .map((line) => (line.product ? String(line.product) : null))
      .filter(Boolean);

    // Discount only the eligible lines. If every line carries a price and
    // quantity we can compute their exact subtotal; otherwise (an older
    // caller that only sent product/category) fall back to the full cart
    // total, same as the previous behaviour.
    const canPriceLines = eligibleItems.every(
      (line) => Number.isFinite(Number(line.price)) && Number.isFinite(Number(line.quantity))
    );
    if (!appliesToAllItems && canPriceLines) {
      eligibleSubtotal = eligibleItems.reduce(
        (sum, line) => sum + Number(line.price) * Number(line.quantity),
        0
      );
    }
  }

  let discount = 0;
  if (coupon.discountType === "percentage") {
    discount = (eligibleSubtotal * coupon.discountValue) / 100;
    if (coupon.maximumDiscount != null) {
      discount = Math.min(discount, coupon.maximumDiscount);
    }
  } else {
    discount = coupon.discountValue;
  }
  // Never let a coupon discount more than the eligible items are worth
  // (or, for a fully-eligible cart, more than the cart total).
  discount = Math.round(Math.min(discount, eligibleSubtotal) * 100) / 100;
  const newTotal = Math.round((total - discount) * 100) / 100;

  return { coupon, discount, newTotal, appliesToAllItems, eligibleProductIds };
}

// Called once an order is actually placed with a coupon: bumps usedCount and
// records this customer's usage so perUserLimit holds up across orders.
export async function recordCouponUsage(coupon, { userId, guestEmail }) {
  coupon.usedCount += 1;
  const usage = coupon.usedBy.find((u) =>
    (userId && u.user && String(u.user) === String(userId)) ||
    (!userId && guestEmail && u.guestEmail && u.guestEmail.toLowerCase() === guestEmail.toLowerCase())
  );
  if (usage) {
    usage.count += 1;
  } else {
    coupon.usedBy.push({
      user: userId || null,
      guestEmail: userId ? null : (guestEmail || null),
      count: 1,
    });
  }
  await coupon.save();
}