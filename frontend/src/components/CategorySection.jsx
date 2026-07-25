import { useTranslation } from "react-i18next";
import { useLanguage } from "../context/LanguageContext";
import { localized } from "../utils/localized";

const CATEGORY_ICONS = {
  kalira: "💛",
  chura: "🔴",
  bangles: "✨",
  necklace: "📿",
  "diamond-cut": "💎",
  "wedding-accessories": "👑",
  jhumka: "✨",
  "wedding-sets": "👑",
};

export default function CategorySection({ categories, onSelect }) {
  const { t } = useTranslation("home");
  const { language } = useLanguage();
  if (!categories || categories.length === 0) return null;

  return (
    <section id="categories-section" className="category-showcase">
      <div className="container">
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <span className="eyebrow">{t("browseByCollection")}</span>
          <h2 className="section-heading" style={{ fontSize: 30, marginTop: 6 }}>
            {t("ourCollections")}
          </h2>
          <div className="divider-gold" style={{ justifyContent: "center" }}>✦</div>
        </div>
        <div className="category-grid">
          {categories.map(cat => {
            const name = localized(cat.name, language);
            return (
              <button
                key={cat._id}
                className="category-tile"
                onClick={() => onSelect(cat)}
                title={`Browse ${name}`}
              >
                <span className="category-tile-photo">
                  {cat.image ? <img src={cat.image} alt="" /> : CATEGORY_ICONS[cat.slug] || "💍"}
                </span>
                <span className="category-tile-name">{name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
