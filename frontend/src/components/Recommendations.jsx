// frontend/src/components/Recommendations.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const Recommendations = ({ productId }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!productId) return;
    const fetchRecommendations = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/products/recommendations/${productId}`);
        if (!res.ok) throw new Error('Failed to load recommendations');
        const data = await res.json();
        setProducts(data);
      } catch (err) {
        setError(err.message);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchRecommendations();
  }, [productId]);

  if (loading) return <div style={{ padding: '20px 0', color: '#888' }}>Loading recommendations...</div>;
  if (error) return null;
  if (products.length === 0) return null;

  return (
    <div style={{ marginTop: '40px', borderTop: '1px solid #e8e0d8', paddingTop: '30px' }}>
      <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '22px', marginBottom: '16px' }}>
        You May Also Like
      </h3>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: '20px',
      }}>
        {products.map(product => {
          const name = product.name?.en || product.name?.bn || 'Product';
          const image = product.images?.[0] || '';
          const price = product.basePrice || 0;
          return (
            <Link key={product._id} to={`/products/${product._id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{
                border: '1px solid #e8e0d8',
                borderRadius: '8px',
                padding: '12px',
                transition: '0.2s',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = '#c9a84c'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e8e0d8'}
              >
                {image ? (
                  <img src={image} alt={name} style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '4px', marginBottom: '8px' }} />
                ) : (
                  <div style={{ width: '100%', height: '160px', background: '#f8f5f0', borderRadius: '4px', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#b8ab98', textTransform: 'uppercase', letterSpacing: '0.5px' }}>No Image</div>
                )}
                <div style={{ fontWeight: '500', fontSize: '14px', marginBottom: '4px', flex: 1 }}>{name}</div>
                <div style={{ fontWeight: '600', color: '#c9a84c', fontSize: '15px' }}>৳ {price.toLocaleString()}</div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default Recommendations;