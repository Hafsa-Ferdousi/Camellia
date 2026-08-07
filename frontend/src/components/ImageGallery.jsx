import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Gem } from "lucide-react";

// Product.images stores Cloudinary URLs baked with a 400px thumb transform
// (used by grid cards). Swapping that transform for a larger c_limit crop
// gives a sharper main image on the detail page without any extra network
// request or backend/schema change. URLs without that exact transform
// (e.g. raw admin-panel uploads) pass through untouched.
const toDetailUrl = (url) =>
  typeof url === "string"
    ? url.replace("/upload/ar_1:1,c_fill,g_auto,w_400/", "/upload/c_limit,w_1000/")
    : url;

export default function ImageGallery({ images = [] }) {
  const { t } = useTranslation("common");
  const [active, setActive] = useState(0);

  return (
    <div>
      {/* Main image */}
      <div style={{ ...styles.main, cursor: images.length ? "zoom-in" : "default" }}>
        {images.length > 0
          ? <img src={toDetailUrl(images[active])} alt={t("productFallback")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <Gem size={36} style={{ opacity: 0.3 }} />
              <span style={{ fontSize: 13, color: "var(--faint)" }}>{t("largeProductImagePlaceholder")}</span>
            </div>
        }
      </div>

      {/* Thumbnails */}
      <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
        {images.length > 0
          ? images.map((img, i) => (
              <button key={i} onClick={() => setActive(i)} style={{ ...styles.thumb, ...(i === active ? styles.thumbActive : {}) }}>
                <img src={img} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </button>
            ))
          : [0, 1, 2].map(i => (
              <div key={i} style={{ ...styles.thumb, background: "var(--parchment)", border: i === 0 ? "2px solid var(--gold)" : "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center" }} />
            ))
        }
      </div>
    </div>
  );
}

const styles = {
  main: {
    width: "100%",
    aspectRatio: "1 / 1",
    background: "var(--parchment)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg)",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  thumb: {
    width: 72,
    height: 72,
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    overflow: "hidden",
    padding: 0,
    cursor: "pointer",
    background: "var(--parchment)",
    transition: "border-color 0.15s",
  },
  thumbActive: {
    border: "2px solid var(--gold)",
    boxShadow: "0 0 0 2px rgba(232,163,23,0.2)",
  },
};
