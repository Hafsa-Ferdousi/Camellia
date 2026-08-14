import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Gem, X, ChevronLeft, ChevronRight } from "lucide-react";
import { cldUrl, cldSrcSet } from "../utils/cloudinaryImage";

export default function ImageGallery({ images = [] }) {
  const { t } = useTranslation("common");
  const [active, setActive] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const triggerRef = useRef(null);
  const closeBtnRef = useRef(null);

  const openZoom = () => {
    if (!images.length) return;
    setZoomOpen(true);
  };
  const closeZoom = () => {
    setZoomOpen(false);
    triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!zoomOpen) return;
    closeBtnRef.current?.focus();
    const onKeyDown = (e) => {
      if (e.key === "Escape") closeZoom();
      if (e.key === "ArrowRight") setActive((i) => (i + 1) % images.length);
      if (e.key === "ArrowLeft") setActive((i) => (i - 1 + images.length) % images.length);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [zoomOpen, images.length]);

  return (
    <div>
      {/* Main image */}
      <button
        type="button"
        ref={triggerRef}
        onClick={openZoom}
        disabled={!images.length}
        aria-label={images.length ? t("zoomImage", { defaultValue: "View larger image" }) : undefined}
        style={{ ...styles.main, cursor: images.length ? "zoom-in" : "default", border: "none", padding: 0 }}
      >
        {images.length > 0
          ? <img
              src={cldUrl(images[active], 800)}
              srcSet={cldSrcSet(images[active], [800, 1200])}
              sizes="(max-width: 768px) 100vw, 500px"
              alt={t("productFallback")}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          : <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <Gem size={36} style={{ opacity: 0.3 }} />
              <span style={{ fontSize: 13, color: "var(--faint)" }}>{t("largeProductImagePlaceholder")}</span>
            </div>
        }
      </button>

      {/* Thumbnails */}
      <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
        {images.length > 0
          ? images.map((img, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActive(i)}
                aria-label={t("selectImageN", { defaultValue: `View image ${i + 1}`, n: i + 1 })}
                aria-current={i === active}
                style={{ ...styles.thumb, ...(i === active ? styles.thumbActive : {}) }}
              >
                <img src={cldUrl(img, 200)} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </button>
            ))
          : [0, 1, 2].map(i => (
              <div key={i} style={{ ...styles.thumb, background: "var(--parchment)", border: i === 0 ? "2px solid var(--gold)" : "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center" }} />
            ))
        }
      </div>

      {zoomOpen && images.length > 0 && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t("zoomImage", { defaultValue: "View larger image" })}
          onClick={closeZoom}
          style={styles.overlay}
        >
          <button
            type="button"
            ref={closeBtnRef}
            onClick={closeZoom}
            aria-label={t("close", { defaultValue: "Close" })}
            style={{ ...styles.overlayBtn, right: 16 }}
          >
            <X size={22} />
          </button>

          {images.length > 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setActive((i) => (i - 1 + images.length) % images.length); }}
              aria-label={t("previousImage", { defaultValue: "Previous image" })}
              style={{ ...styles.overlayBtn, left: 16, top: "50%", transform: "translateY(-50%)" }}
            >
              <ChevronLeft size={26} />
            </button>
          )}

          <img
            src={cldUrl(images[active], 1600, { square: false })}
            alt={t("productFallback")}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "90vw", maxHeight: "85vh", objectFit: "contain", borderRadius: 4 }}
          />

          {images.length > 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setActive((i) => (i + 1) % images.length); }}
              aria-label={t("nextImage", { defaultValue: "Next image" })}
              style={{ ...styles.overlayBtn, right: 16, top: "50%", transform: "translateY(-50%)" }}
            >
              <ChevronRight size={26} />
            </button>
          )}
        </div>
      )}
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
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(28,10,15,0.85)",
    zIndex: 300,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  overlayBtn: {
    position: "absolute",
    top: 16,
    background: "rgba(255,255,255,0.12)",
    border: "none",
    borderRadius: "50%",
    width: 44,
    height: 44,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    cursor: "pointer",
  },
};
