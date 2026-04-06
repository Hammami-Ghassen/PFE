import React from 'react';

const Card = ({ children, className = '', padding = true }) => (
  <div
    className={`bg-white rounded-xl shadow-sm border border-gray-100 ${
      padding ? 'p-6' : ''
    } ${className}`}
  >
    {children}
  </div>
);

export default Card;
