import React from 'react';

const Badge = ({ status, label }) => {
  const styles = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-red-100 text-red-800',
    ADMIN: 'bg-blue-100 text-blue-800',
    DIRECTEUR: 'bg-indigo-100 text-indigo-800',
    AGENT: 'bg-gray-100 text-gray-700',
  };

  const key = status ?? label;
  const style = styles[key] || 'bg-gray-100 text-gray-700';

  return (
    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${style}`}>
      {label ?? status}
    </span>
  );
};

export default Badge;
