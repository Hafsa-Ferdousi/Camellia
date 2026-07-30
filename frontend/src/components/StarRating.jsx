// frontend/src/components/StarRating.jsx
import React from 'react';
import { useTranslation } from 'react-i18next';

const StarRating = ({ rating = 0, totalReviews = 0, onRatingChange, interactive = false }) => {
  const { t } = useTranslation('products');
  const stars = [1, 2, 3, 4, 5];
  const roundedRating = Math.round(rating * 2) / 2;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
      <div style={{ display: 'flex' }}>
        {stars.map((star) => {
          const isFull = star <= roundedRating;
          const isHalf = star - 0.5 <= roundedRating && roundedRating < star;

          return (
            <span
              key={star}
              onClick={() => interactive && onRatingChange && onRatingChange(star)}
              style={{
                position: 'relative',
                display: 'inline-block',
                cursor: interactive ? 'pointer' : 'default',
                fontSize: '24px',
                lineHeight: 1,
                transition: '0.2s',
                userSelect: 'none',
              }}
            >
              <span style={{ color: '#ddd' }}>★</span>
              {(isFull || isHalf) && (
                <span
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    overflow: 'hidden',
                    width: isFull ? '100%' : '50%',
                    color: '#f5b301',
                  }}
                >
                  ★
                </span>
              )}
            </span>
          );
        })}
      </div>
      {totalReviews !== undefined && (
        <span style={{ color: '#888', fontSize: '14px' }}>
          {t('reviewCount', { count: totalReviews })}
        </span>
      )}
    </div>
  );
};

export default StarRating;