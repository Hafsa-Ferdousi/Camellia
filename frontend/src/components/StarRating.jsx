// frontend/src/components/StarRating.jsx
import React from 'react';

const StarRating = ({ rating = 0, totalReviews = 0, onRatingChange, interactive = false }) => {
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
                cursor: interactive ? 'pointer' : 'default',
                color: (isFull || isHalf) ? '#f5b301' : '#ddd',
                fontSize: '24px',
                transition: '0.2s',
                userSelect: 'none',
              }}
            >
              {isFull ? '★' : isHalf ? '★' : '☆'}
            </span>
          );
        })}
      </div>
      {totalReviews !== undefined && (
        <span style={{ color: '#888', fontSize: '14px' }}>
          ({totalReviews} review{totalReviews !== 1 ? 's' : ''})
        </span>
      )}
    </div>
  );
};

export default StarRating;