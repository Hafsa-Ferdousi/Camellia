import Coupon from "../models/Coupon.js";

// Fetches every currently-active, in-date coupon once so a batch of products
// can each be checked against it without one coupon query per product.
export async function getActiveCoupons() {
  const now = new Date();
  return Coupon.find({ isActive: true, startDate: { $lte: now }, endDate: { $gte: now } })
    .select("code discountType discountValue applicableProducts applicableCategories excludedProducts")
    .lean();
}

// Mirrors the scoping rule in couponEngine.js's findAndValidateCoupon: a
// product is eligible unless explicitly excluded; if the coupon lists
// applicableProducts/applicableCategories, the product must match one of
// them, otherwise (no scope set) the coupon is store-wide.
const couponAppliesToProduct = (coupon, productId, categoryId) => {
  if ((coupon.excludedProducts || []).some((id) => String(id) === productId)) return false;
  const hasProductScope = coupon.applicableProducts?.length > 0;
  const hasCategoryScope = coupon.applicableCategories?.length > 0;
  if (!hasProductScope && !hasCategoryScope) return true;
  const productMatch = hasProductScope && coupon.applicableProducts.some((id) => String(id) === productId);
  const categoryMatch = hasCategoryScope && categoryId &&
    coupon.applicableCategories.some((id) => String(id) === categoryId);
  return productMatch || categoryMatch;
};

// When more than one active coupon applies to a product, prefer one that
// specifically targets it/its category over a store-wide one (more
// relevant), then the larger discount value, so the badge shown is the most
// useful offer rather than an arbitrary one.
const pickBestOffer = (coupons, productId, categoryId) => {
  const matches = coupons.filter((c) => couponAppliesToProduct(c, productId, categoryId));
  if (matches.length === 0) return null;

  const isScoped = (c) => (c.applicableProducts?.length > 0 || c.applicableCategories?.length > 0);
  matches.sort((a, b) => {
    const scopeDiff = (isScoped(b) ? 1 : 0) - (isScoped(a) ? 1 : 0);
    if (scopeDiff !== 0) return scopeDiff;
    return b.discountValue - a.discountValue;
  });

  const { code, discountType, discountValue } = matches[0];
  return { code, discountType, discountValue };
};

// Attaches an `offer` field (the best-matching active coupon, or null) to
// each product. Products must be plain objects (.lean() query results, or
// spread from .toObject()) — Mongoose documents silently drop ad-hoc
// properties like this when serialized with res.json().
export function tagProductsWithOffers(products, coupons) {
  return products.map((p) => {
    const categoryId = p.category?._id ? String(p.category._id) : (p.category ? String(p.category) : null);
    return { ...p, offer: pickBestOffer(coupons, String(p._id), categoryId) };
  });
}

export async function tagWithOffers(products) {
  const coupons = await getActiveCoupons();
  return tagProductsWithOffers(products, coupons);
}

export async function tagOneWithOffer(product) {
  if (!product) return product;
  const coupons = await getActiveCoupons();
  const categoryId = product.category?._id ? String(product.category._id) : (product.category ? String(product.category) : null);
  return { ...product, offer: pickBestOffer(coupons, String(product._id), categoryId) };
}
