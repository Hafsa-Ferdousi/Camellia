import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Truck, Gift, RotateCcw, Heart, Check } from "lucide-react";
import { getProductById } from "../api/products";
import client from "../api/client";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { localized } from "../utils/localized";
import { formatPrice } from "../utils/formatPrice";
import ImageGallery from "../components/ImageGallery";
import { addToWishlist, removeFromWishlist } from "../api/wishlist";
import StarRating from "../components/StarRating";
import Recommendations from '../components/Recommendations';

export default function ProductDetail() {
  const { t } = useTranslation("products");
  const { language } = useLanguage();
  const { id } = useParams();
  const { addItem } = useCart();
  const { user } = useAuth();
  const isLoggedIn = !!user;
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [msg, setMsg] = useState({ text: "", type: "ok" });
  const [loading, setLoading] = useState(true);
  const [wishlisted, setWishlisted] = useState(false);

  // ===== REVIEWS STATE =====
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [userRating, setUserRating] = useState(0);
  const [userComment, setUserComment] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [reviewErr, setReviewErr] = useState("");

  // 👇 NEW STATES FOR GUEST REVIEW
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");

  // Only customers with a delivered order for this product may review it —
  // checked here so the form can tell them why before they fill it out
  // (the backend enforces the same rule regardless, on submit).
  const [eligibility, setEligibility] = useState({ checked: false, eligible: false, reason: null });

  useEffect(() => {
    if (!id || !isLoggedIn) return;
    setEligibility({ checked: false, eligible: false, reason: null });
    client.get(`/reviews/${id}/eligibility`)
      .then((r) => setEligibility({ checked: true, eligible: r.data.eligible, reason: r.data.reason }))
      .catch(() => setEligibility({ checked: true, eligible: false, reason: null }));
  }, [id, isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn || !id) return;
    const email = guestEmail.trim();
    if (!email.includes("@")) {
      setEligibility({ checked: false, eligible: false, reason: null });
      return;
    }
    const timer = setTimeout(() => {
      client.get(`/reviews/${id}/eligibility`, { params: { email } })
        .then((r) => setEligibility({ checked: true, eligible: r.data.eligible, reason: r.data.reason }))
        .catch(() => setEligibility({ checked: true, eligible: false, reason: null }));
    }, 400);
    return () => clearTimeout(timer);
  }, [guestEmail, isLoggedIn, id]);

  // ===== FETCH PRODUCT =====
  useEffect(() => {
    setLoading(true);
    getProductById(id)
      .then((r) => setProduct(r.data))
      .catch(() => navigate("/"))
      .finally(() => setLoading(false));
  }, [id]);

  // ===== FETCH REVIEWS =====
  const [reviewsError, setReviewsError] = useState(false);
  useEffect(() => {
    const fetchReviews = async () => {
      setReviewsError(false);
      try {
        const res = await client.get(`/reviews/${id}`);
        setReviews(res.data.reviews || []);
        setAverageRating(res.data.averageRating || 0);
        setTotalReviews(res.data.totalReviews || 0);
      } catch (error) {
        setReviews([]);
        setAverageRating(0);
        setTotalReviews(0);
        setReviewsError(true);
      }
    };

    if (id) fetchReviews();
  }, [id]);

  // ===== SUBMIT REVIEW (NOW SUPPORTS GUESTS) =====
  const submitReview = async (e) => {
    e.preventDefault();
    setReviewErr("");

    // Validate
    if (!userRating || !userComment.trim()) {
      setReviewErr(t("selectRatingAlert"));
      return;
    }

    // Prepare payload
    const payload = {
      rating: userRating,
      comment: userComment.trim(),
    };

    // If NOT logged in, send guest details
    if (!isLoggedIn) {
      if (!guestName.trim() || !guestEmail.trim()) {
        setReviewErr(t("guestDetailsAlert"));
        return;
      }
      payload.guestName = guestName.trim();
      payload.guestEmail = guestEmail.trim();
    }

    setReviewLoading(true);
    try {
      // The shared client attaches the Authorization header automatically
      // when logged in — no manual token handling needed here.
      await client.post(`/reviews/${id}`, payload);

      setReviewSubmitted(true);
      setUserRating(0);
      setUserComment("");
      setGuestName("");
      setGuestEmail("");
      // Refresh reviews
      const updated = await client.get(`/reviews/${id}`);
      setReviews(updated.data.reviews || []);
      setAverageRating(updated.data.averageRating || 0);
      setTotalReviews(updated.data.totalReviews || 0);
    } catch (error) {
      setReviewErr(error.response?.data?.message || t("reviewSubmitFailedAlert"));
    } finally {
      setReviewLoading(false);
    }
  };

  // ===== HANDLE ADD TO CART =====
  const handleAddToCart = () => {
    addItem(product, quantity);
    setMsg({ text: t("addedToCart"), type: "ok" });
    setTimeout(() => setMsg({ text: "", type: "ok" }), 2500);
  };

  const handleWishlist = async () => {
    try {
      if (wishlisted) {
        await removeFromWishlist(product._id);
        setWishlisted(false);
      } else {
        await addToWishlist(product._id);
        setWishlisted(true);
      }
    } catch {
      setMsg({ text: t("loginForWishlist"), type: "err" });
      setTimeout(() => setMsg({ text: "", type: "ok" }), 2500);
    }
  };
  
  if (loading) {
    return (
      <div className="container" style={{ paddingTop: 48, paddingBottom: 48 }}>
        <div className="detail-grid">
          <div style={{ aspectRatio: "1/1", background: "var(--parchment)", borderRadius: "var(--radius-lg)" }} />
          <div>
            {[120, 80, 200, 160].map((w, i) => (
              <div key={i} style={{ height: 20, background: "var(--parchment)", borderRadius: 4, width: w, marginBottom: 16 }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!product) return null;

  const stock = product.totalStock;
  const price = product.basePrice;
  const outOfStock = (stock ?? 0) <= 0;

  return (
    <div className="container" style={{ paddingTop: 28, paddingBottom: 64 }}>
      {/* Breadcrumb */}
      <nav className="breadcrumb">
        <Link to="/">{t("home")}</Link>
        <span>/</span>
        <Link to="/products">{t("products")}</Link>
        {product.category?.name && <><span>/</span><span>{localized(product.category.name, language)}</span></>}
        <span>/</span>
        <span style={{ color: "var(--charcoal)" }}>{localized(product.name, language)}</span>
      </nav>

      <div className="detail-grid">
        {/* Gallery */}
        <ImageGallery images={product.images || []} />

        {/* Info */}
        <div>
          {product.category?.name && (
            <span className="eyebrow" style={{ marginBottom: 8, display: "block" }}>
              {localized(product.category.name, language)}
            </span>
          )}
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 600, marginBottom: 10 }}>
            {localized(product.name, language)}
          </h1>

          {/* Stars - DYNAMIC */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <StarRating rating={averageRating} totalReviews={totalReviews} />
          </div>

          {/* Price */}
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 30,
              color: "var(--gold-text)",
              fontWeight: 600,
              marginBottom: 6,
              letterSpacing: "0.02em",
            }}
          >
            ৳ {formatPrice(price, language)}
          </p>

          {/* Stock */}
          <p style={{ fontSize: 13, fontWeight: 600, color: outOfStock ? "var(--red)" : "var(--green)", marginBottom: 20, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: outOfStock ? "var(--red)" : "var(--green)" }} />
            {outOfStock ? t("outOfStock") : t("inStockCount", { count: stock })}
          </p>

          {/* Divider */}
          <div style={{ borderTop: "1px solid var(--border)", margin: "0 0 20px" }} />

          {/* Description */}
          {localized(product.description, language) && (
            <div style={{ marginBottom: 22 }}>
              <p style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 500, marginBottom: 8 }}>{t("description")}</p>
              <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.7 }}>{localized(product.description, language)}</p>
            </div>
          )}

          {/* Quantity */}
          <div style={{ marginBottom: 24 }}>
            <p style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 500, marginBottom: 10 }}>{t("quantity")}</p>
            <div className="qty-stepper">
              <button className="qty-btn" onClick={() => setQuantity((q) => Math.max(1, q - 1))}>
                −
              </button>
              <span style={{ fontSize: 15, minWidth: 36, textAlign: "center", padding: "0 6px", fontWeight: 500 }}>
                {quantity}
              </span>
              <button className="qty-btn" onClick={() => setQuantity((q) => Math.min(stock, q + 1))} disabled={quantity >= stock}>
                +
              </button>
            </div>
          </div>

          {/* CTA buttons */}
          <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
            <button
              className="btn"
              disabled={outOfStock}
              onClick={handleAddToCart}
              style={{ flex: 2, fontSize: 13 }}
            >
              {outOfStock ? t("outOfStock") : t("addToCart")}
            </button>
            <button
              onClick={handleWishlist}
              style={{
                flex: 1,
                padding: "11px 14px",
                border: `1px solid ${wishlisted ? "var(--red)" : "var(--border)"}`,
                borderRadius: "var(--radius-sm)",
                background: wishlisted ? "#FFF5F5" : "var(--ivory)",
                fontSize: 13,
                cursor: "pointer",
                color: wishlisted ? "var(--red)" : "var(--muted)",
                fontFamily: "var(--font-body)",
                transition: "all 0.15s",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Heart size={14} fill={wishlisted ? "var(--red)" : "none"} /> {wishlisted ? t("wishlistSaved") : t("wishlist")}
            </button>
          </div>

          {msg.text && (
            <p style={{ fontSize: 13, color: msg.type === "ok" ? "var(--green)" : "var(--red)", marginBottom: 12, padding: "10px 14px", background: msg.type === "ok" ? "#F0FDF4" : "#FEF2F2", borderRadius: "var(--radius-sm)", border: `1px solid ${msg.type === "ok" ? "#BBF7D0" : "#FECACA"}`, display: "flex", alignItems: "center", gap: 6 }}>
              {msg.type === "ok" && <Check size={14} />} {msg.text}
            </p>
          )}

          {/* Delivery info */}
          <div style={{ background: "var(--cream-dark)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "14px 16px", marginTop: 16 }}>
            {[[Truck, t("freeDelivery")],[Gift, t("giftPackaging")],[RotateCcw, t("easyReturns")]].map(([Icon, text]) => (
              <div key={text} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 6, fontSize: 13, color: "var(--muted)" }}>
                <Icon size={15} /><span>{text}</span>
              </div>
            ))}
          </div>

          {/* ===== REVIEWS SECTION - UPDATED WITH GUEST SUPPORT ===== */}
          <div style={{ marginTop: 28, paddingTop: 24, borderTop: "1px solid var(--border)" }}>
            <p style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, marginBottom: 14 }}>{t("customerReviews")}</p>

            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
              <StarRating rating={averageRating} totalReviews={totalReviews} />
              <span style={{ fontSize: 14, color: "var(--muted)" }}>
                {totalReviews > 0 ? t("averageRatingLabel", { rating: averageRating.toFixed(1) }) : t("noReviewsYetShort")}
              </span>
            </div>

            {/* Reviews List */}
            <div style={{ marginBottom: 20 }}>
              {reviewsError ? (
                <p style={{ color: "var(--red)", fontSize: 14 }}>{t("reviewsLoadError")}</p>
              ) : reviews.length === 0 ? (
                <p style={{ color: "var(--muted)", fontSize: 14 }}>{t("noReviewsBeFirst")}</p>
              ) : (
                reviews.map((rev) => (
                  <div key={rev._id} style={{ borderBottom: "1px solid var(--border)", padding: "14px 0" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        marginBottom: 4,
                      }}
                    >
                      <strong style={{ fontSize: 15 }}>{rev.userName}</strong>
                      <span style={{ fontSize: 12, color: "var(--muted)" }}>
                        {new Date(rev.createdAt).toLocaleDateString(language === "bn" ? "bn-BD" : "en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <StarRating rating={rev.rating} />
                    <p style={{ margin: "6px 0 0", color: "var(--muted)", fontSize: 14, lineHeight: 1.6 }}>{rev.comment}</p>
                  </div>
                ))
              )}
            </div>

            {/* ===== WRITE A REVIEW FORM - ALWAYS VISIBLE ===== */}
            <div style={{ background: "var(--cream-dark)", padding: "20px", borderRadius: "8px", border: "1px solid var(--border)" }}>
              <h4 style={{ marginBottom: 12, fontSize: 16 }}>{t("writeReview")}</h4>

              {reviewSubmitted ? (
                <p style={{ color: "var(--green)", display: "flex", alignItems: "center", gap: 6 }}><Check size={16} strokeWidth={2.5} /> {t("thankYouReview")}</p>
              ) : (
                <form onSubmit={submitReview}>
                  {/* Show Name & Email fields ONLY for guests */}
                  {!isLoggedIn && (
                    <div className="review-guest-fields" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                      <div>
                        <label style={{ display: "block", marginBottom: 4, fontSize: 13, fontWeight: 500 }}>
                          {t("yourName")}
                        </label>
                        <input
                          type="text"
                          value={guestName}
                          onChange={(e) => setGuestName(e.target.value)}
                          placeholder={t("enterYourName")}
                          required
                          style={{
                            width: "100%",
                            padding: "8px 12px",
                            border: "1px solid var(--border)",
                            borderRadius: "6px",
                            fontSize: "14px",
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", marginBottom: 4, fontSize: 13, fontWeight: 500 }}>
                          {t("yourEmail")}
                        </label>
                        <input
                          type="email"
                          value={guestEmail}
                          onChange={(e) => setGuestEmail(e.target.value)}
                          placeholder={t("emailPlaceholder")}
                          required
                          style={{
                            width: "100%",
                            padding: "8px 12px",
                            border: "1px solid var(--border)",
                            borderRadius: "6px",
                            fontSize: "14px",
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {isLoggedIn && eligibility.checked && !eligibility.eligible && (
                    <p style={{ color: "var(--red)", fontSize: 13, marginBottom: 12 }}>
                      {eligibility.reason === "already_reviewed"
                        ? t("alreadyReviewed")
                        : t("notPurchased")}
                    </p>
                  )}
                  {!isLoggedIn && guestEmail.trim().includes("@") && eligibility.checked && !eligibility.eligible && (
                    <p style={{ color: "var(--red)", fontSize: 13, marginBottom: 12 }}>
                      {eligibility.reason === "already_reviewed"
                        ? t("alreadyReviewedEmail")
                        : t("notPurchasedEmail")}
                    </p>
                  )}

                  {(isLoggedIn ? eligibility.eligible : (guestEmail.trim().includes("@") && eligibility.eligible)) && (
                    <>
                      <div style={{ marginBottom: 12 }}>
                        <label style={{ display: "block", marginBottom: 4, fontSize: 14, fontWeight: 500 }}>
                          {t("yourRating")}
                        </label>
                        <StarRating rating={userRating} onRatingChange={setUserRating} interactive={true} />
                      </div>

                      <div style={{ marginBottom: 12 }}>
                        <label style={{ display: "block", marginBottom: 4, fontSize: 14, fontWeight: 500 }}>
                          {t("yourComment")}
                        </label>
                        <textarea
                          value={userComment}
                          onChange={(e) => setUserComment(e.target.value)}
                          placeholder={t("commentPlaceholder")}
                          required
                          rows="3"
                          style={{
                            width: "100%",
                            padding: "10px 14px",
                            border: "1px solid var(--border)",
                            borderRadius: "6px",
                            fontSize: 14,
                            fontFamily: "inherit",
                            resize: "vertical",
                            background: "var(--ivory)",
                          }}
                        />
                      </div>

                      {reviewErr && (
                        <p style={{ color: "var(--red)", fontSize: 13, marginBottom: 12, padding: "10px 14px", background: "#FEF2F2", borderRadius: "var(--radius-sm)", border: "1px solid #FECACA" }}>
                          {reviewErr}
                        </p>
                      )}

                      <button
                        type="submit"
                        disabled={reviewLoading}
                        style={{
                          padding: "10px 28px",
                          background: "var(--gold)",
                          color: "#2A1206",
                          border: "none",
                          borderRadius: "6px",
                          fontSize: 14,
                          fontWeight: 600,
                          cursor: reviewLoading ? "not-allowed" : "pointer",
                          opacity: reviewLoading ? 0.7 : 1,
                        }}
                      >
                        {reviewLoading ? t("submitting") : t("submitReview")}
                      </button>
                    </>
                  )}
                </form>
              )}
            </div>
          </div>

          {/* ===== AI RECOMMENDATIONS ===== */}
          <Recommendations productId={id} />

        </div>
      </div>
    </div>
  );
}