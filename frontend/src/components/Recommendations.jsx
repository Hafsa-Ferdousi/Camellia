// frontend/src/components/Recommendations.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getRecommendations } from '../api/products';
import { useLanguage } from '../context/LanguageContext';
import { localized } from '../utils/localized';
import { cldUrl, cldSrcSet } from '../utils/cloudinaryImage';

const Recommendations = ({ productId }) => {
  const { t } = useTranslation('products');
  const { language } = useLanguage();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!productId) return;
    let cancelled = false;
    setLoading(true);
    getRecommendations(productId, 8)
      .then(({ data }) => {
        if (cancelled) return;
        setProducts(data);
        setError('');
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
        setProducts([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [productId]);

  if (loading) return <div style={{ padding: '20px 0', color: 'var(--muted)' }}>{t('loading', { defaultValue: 'Loading…' })}</div>;
  if (error) return null;
  if (products.length === 0) return null;

  return (
    <div style={{ marginTop: '48px', borderTop: '1px solid var(--border)', paddingTop: '36px', paddingBottom: '8px' }}>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontStyle: 'italic', textAlign: 'center', marginBottom: '28px' }}>
        {t('youMayAlsoLike')}
      </h3>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 220px))',
        justifyContent: 'center',
        gap: '24px',
      }}>
        {products.map(product => {
          const name = localized(product.name, language) || t('productFallback');
          const image = product.images?.[0] || '';
          const price = product.basePrice || 0;
          return (
            <Link key={product._id} to={`/products/${product._id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '12px',
                transition: '0.2s',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--gold)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                {image ? (
                  <img
                    src={cldUrl(image, 400)}
                    srcSet={cldSrcSet(image, [200, 400])}
                    sizes="(max-width: 480px) 50vw, 220px"
                    alt={name}
                    loading="lazy"
                    style={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', borderRadius: '4px', marginBottom: '8px' }}
                  />
                ) : (
                  <div style={{ width: '100%', aspectRatio: '1 / 1', background: 'var(--parchment)', borderRadius: '4px', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('noImage')}</div>
                )}
                <div style={{ fontWeight: '500', fontSize: '14px', marginBottom: '4px', flex: 1 }}>{name}</div>
                <div style={{ fontWeight: '600', color: 'var(--gold-text)', fontSize: '15px' }}>৳ {price.toLocaleString()}</div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default Recommendations;
