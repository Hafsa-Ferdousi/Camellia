import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getProductById } from "../api/products";
import { useCart } from "../context/CartContext";
import ImageGallery from "../components/ImageGallery";
import { addToWishlist, removeFromWishlist } from "../api/wishlist";
import StarRating from "../components/StarRating";

export default function ProductDetail() {
  const { id } = useParams();
  const { addItem } = useCart();
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
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // 👇 NEW STATES FOR GUEST REVIEW
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");

  // ===== CHECK LOGIN STATUS =====
  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsLoggedIn(!!token);
  }, []);

  // ===== FETCH PRODUCT =====
  useEffect(() => {
    setLoading(true);
    getProductById(id)
      .then((r) => setProduct(r.data))
      .catch(() => navigate("/"))
      .finally(() => setLoading(false));
  }, [id]);

  // ===== FETCH REVIEWS =====
  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const res = await fetch(`/api/reviews/${id}`);
        if (res.ok) {
          const data = await res.json();
          setReviews(data.reviews || []);
          setAverageRating(data.averageRating || 0);
          setTotalReviews(data.totalReviews || 0);
        } else {
          setMockReviews();
        }
      } catch (error) {
        setMockReviews();
      }
    };

    const setMockReviews = () => {
      setReviews([
        {
          _id: "1",
          userName: "Sadia Rahman",
          rating: 5,
          comment: "Absolutely stunning piece! The quality exceeded my expectations. Highly recommend!",
          createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        },
        {
          _id: "2",
          userName: "Raisa Khan",
          rating: 4,
          comment: "Beautiful design and fast shipping. Will definitely buy again.",
          createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
        },
        {
          _id: "3",
          userName: "Hafsa Ferdousi",
          rating: 5,
          comment: "Perfect for my wedding! Got so many compliments. Thank you Camellia!",
          createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
        },
      ]);
      setAverageRating(4.7);
      setTotalReviews(3);
    };

    if (id) fetchReviews();
  }, [id]);

  // ===== SUBMIT REVIEW (NOW SUPPORTS GUESTS) =====
  const submitReview = async (e) => {
    e.preventDefault();

    // Validate
    if (!userRating || !userComment.trim()) {
      alert("Please select a rating and write a comment.");
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
        alert("Please enter your name and email to leave a review.");
        return;
      }
      payload.guestName = guestName.trim();
      payload.guestEmail = guestEmail.trim();
    }

    setReviewLoading(true);
    try {
      // No Authorization header needed anymore!
      const headers = {
        "Content-Type": "application/json",
      };
      // If logged in, add token
      const token = localStorage.getItem("token");
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch(`/api/reviews/${id}`, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setReviewSubmitted(true);
        setUserRating(0);
        setUserComment("");
        setGuestName("");
        setGuestEmail("");
        // Refresh reviews
        const updatedRes = await fetch(`/api/reviews/${id}`);
        const data = await updatedRes.json();
        setReviews(data.reviews || []);
        setAverageRating(data.averageRating || 0);
        setTotalReviews(data.totalReviews || 0);
        alert("✅ Review submitted successfully!");
      } else {
        const err = await res.json();
        alert(err.message || "Failed to submit review.");
      }
    } catch (error) {
      alert("Network error. Please try again.");
    } finally {
      setReviewLoading(false);
    }
  };

  // ===== HANDLE ADD TO CART =====
  const handleAddToCart = () => {
    addItem(product, quantity);
    setMsg({ text: "Added to your cart ✓", type: "ok" });
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
      setMsg({ text: "Please login to use wishlist!", type: "err" });
      setTimeout(() => setMsg({ text: "", type: "ok" }), 2500);
    }
  };
  
  if (loading) {
    return (
      <div className="container" style={{ padding: "48px 0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48 }}>
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
    <div className="container" style={{ padding: "28px 0 64px" }}>
      {/* Breadcrumb */}
      <nav className="breadcrumb">
        <Link to="/">Home</Link>
        <span>/</span>
        <Link to="/products">Products</Link>
        {product.category?.name?.en && (
          <>
            <span>/</span>
            <span>{product.category.name.en}</span>
          </>
        )}
        <span>/</span>
        <span style={{ color: "var(--charcoal)" }}>{product.name?.en}</span>
      </nav>

      <div className="detail-grid">
        {/* Gallery */}
        <ImageGallery images={product.images || []} />

        {/* Info */}
        <div>
          {product.category?.name?.en && (
            <span className="eyebrow" style={{ marginBottom: 8, display: "block" }}>
              {product.category.name.en}
            </span>
          )}
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 600, marginBottom: 10 }}>
            {product.name?.en}
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
            ৳ {price?.toLocaleString()}
          </p>

          {/* Stock */}
          <p
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: outOfStock ? "var(--red)" : "var(--green)",
              marginBottom: 20,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: outOfStock ? "var(--red)" : "var(--green)",
              }}
            />
            {outOfStock ? "Out of stock" : `In Stock — ${stock} available`}
          </p>

          {/* Divider */}
          <div style={{ borderTop: "1px solid var(--border)", margin: "0 0 20px" }} />

          {/* Description */}
          {product.description?.en && (
            <div style={{ marginBottom: 22 }}>
              <p
                style={{
                  fontSize: 11,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--muted)",
                  fontWeight: 500,
                  marginBottom: 8,
                }}
              >
                Description
              </p>
              <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.7 }}>{product.description.en}</p>
            </div>
          )}

          {/* Quantity */}
          <div style={{ marginBottom: 24 }}>
            <p
              style={{
                fontSize: 11,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--muted)",
                fontWeight: 500,
                marginBottom: 10,
              }}
            >
              Quantity
            </p>
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
              {outOfStock ? "Out of Stock" : "Add to Cart"}
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
              }}
            >
              {wishlisted ? "♥ Saved" : "Wishlist ♡"}
            </button>
          </div>

          {msg.text && (
            <p
              style={{
                fontSize: 13,
                color: msg.type === "ok" ? "var(--green)" : "var(--red)",
                marginBottom: 12,
                padding: "10px 14px",
                background: msg.type === "ok" ? "#F0FDF4" : "#FEF2F2",
                borderRadius: "var(--radius-sm)",
                border: `1px solid ${msg.type === "ok" ? "#BBF7D0" : "#FECACA"}`,
              }}
            >
              {msg.text}
            </p>
          )}

          {/* Delivery info */}
          <div
            style={{
              background: "var(--cream-dark)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              padding: "14px 16px",
              marginTop: 16,
            }}
          >
            {[
              ["🚚", "Free delivery across Bangladesh"],
              ["🎁", "Beautiful gift packaging included"],
              ["↩️", "Easy returns within 7 days"],
            ].map(([icon, text]) => (
              <div
                key={text}
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  marginBottom: 6,
                  fontSize: 13,
                  color: "var(--muted)",
                }}
              >
                <span>{icon}</span>
                <span>{text}</span>
              </div>
            ))}
          </div>

          {/* ===== REVIEWS SECTION - UPDATED WITH GUEST SUPPORT ===== */}
          <div style={{ marginTop: 28, paddingTop: 24, borderTop: "1px solid var(--border)" }}>
            <p style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
              Customer Reviews
            </p>

            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
              <StarRating rating={averageRating} totalReviews={totalReviews} />
              <span style={{ fontSize: 14, color: "#888" }}>
                {totalReviews > 0 ? `Average ${averageRating.toFixed(1)} / 5` : "No reviews yet"}
              </span>
            </div>

            {/* Reviews List */}
            <div style={{ marginBottom: 20 }}>
              {reviews.length === 0 ? (
                <p style={{ color: "#999", fontSize: 14 }}>No reviews yet. Be the first to review this product!</p>
              ) : (
                reviews.map((rev) => (
                  <div key={rev._id} style={{ borderBottom: "1px solid #f0ebe5", padding: "14px 0" }}>
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
                      <span style={{ fontSize: 12, color: "#999" }}>
                        {new Date(rev.createdAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <StarRating rating={rev.rating} />
                    <p style={{ margin: "6px 0 0", color: "#555", fontSize: 14, lineHeight: 1.6 }}>{rev.comment}</p>
                  </div>
                ))
              )}
            </div>

            {/* ===== WRITE A REVIEW FORM - ALWAYS VISIBLE ===== */}
            <div style={{ background: "#f8f5f0", padding: "20px", borderRadius: "8px" }}>
              <h4 style={{ marginBottom: 12, fontSize: 16 }}>Write a Review</h4>

              {reviewSubmitted ? (
                <p style={{ color: "#2e7d32" }}>✅ Thank you for your review!</p>
              ) : (
                <form onSubmit={submitReview}>
                  {/* Show Name & Email fields ONLY for guests */}
                  {!isLoggedIn && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                      <div>
                        <label style={{ display: "block", marginBottom: 4, fontSize: 13, fontWeight: 500 }}>
                          Your Name *
                        </label>
                        <input
                          type="text"
                          value={guestName}
                          onChange={(e) => setGuestName(e.target.value)}
                          placeholder="Enter your name"
                          required
                          style={{
                            width: "100%",
                            padding: "8px 12px",
                            border: "1px solid #ddd",
                            borderRadius: "6px",
                            fontSize: "14px",
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", marginBottom: 4, fontSize: 13, fontWeight: 500 }}>
                          Your Email *
                        </label>
                        <input
                          type="email"
                          value={guestEmail}
                          onChange={(e) => setGuestEmail(e.target.value)}
                          placeholder="you@example.com"
                          required
                          style={{
                            width: "100%",
                            padding: "8px 12px",
                            border: "1px solid #ddd",
                            borderRadius: "6px",
                            fontSize: "14px",
                          }}
                        />
                      </div>
                    </div>
                  )}

                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: "block", marginBottom: 4, fontSize: 14, fontWeight: 500 }}>
                      Your Rating *
                    </label>
                    <StarRating rating={userRating} onRatingChange={setUserRating} interactive={true} />
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: "block", marginBottom: 4, fontSize: 14, fontWeight: 500 }}>
                      Your Comment *
                    </label>
                    <textarea
                      value={userComment}
                      onChange={(e) => setUserComment(e.target.value)}
                      placeholder="Share your experience with this product..."
                      required
                      rows="3"
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        border: "1px solid #ddd",
                        borderRadius: "6px",
                        fontSize: 14,
                        fontFamily: "inherit",
                        resize: "vertical",
                        background: "#fff",
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={reviewLoading}
                    style={{
                      padding: "10px 28px",
                      background: "#c9a84c",
                      color: "#fff",
                      border: "none",
                      borderRadius: "6px",
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: reviewLoading ? "not-allowed" : "pointer",
                      opacity: reviewLoading ? 0.7 : 1,
                    }}
                  >
                    {reviewLoading ? "Submitting..." : "Submit Review"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}