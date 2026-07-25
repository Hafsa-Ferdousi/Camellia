import { useTranslation } from "react-i18next";
import { useLanguage } from "../context/LanguageContext";
import { localized } from "../utils/localized";
import { getCategoryIcon } from "../utils/categoryIcons";

export default function CategorySection({ categories, error, onSelect }) {
  const { t } = useTranslation("home");
  const { language } = useLanguage();
  if (!error && (!categories || categories.length === 0)) return null;

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
        {error ? (
          <p style={{ textAlign: "center", color: "var(--red)", fontSize: 13 }}>
            {t("categoriesLoadError", "Couldn't load categories. Please try again later.")}
          </p>
        ) : (
        <div className="category-grid">
          {categories.map(cat => {
            const name = localized(cat.name, language);
            const Icon = getCategoryIcon(cat.slug);
            return (
              <button
                key={cat._id}
                className="category-tile"
                onClick={() => onSelect(cat)}
                title={t("browseCategory", { name })}
              >
                <span className="category-tile-photo">
                  {cat.image ? <img src={cat.image} alt="" /> : <Icon size={22} strokeWidth={1.5} />}
                </span>
                <span className="category-tile-name">{name}</span>
              </button>
            );
          })}
        </div>
        )}
      </div>
    </section>
  );
}
