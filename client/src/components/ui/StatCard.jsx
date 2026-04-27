import React from 'react';

const StatCard = ({ title, value, subtitle, icon: Icon, accentColor = 'bg-ministere-50' }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-gray-500 text-sm font-medium tracking-wide uppercase mb-1">{title}</h3>
          <p className="text-4xl font-bold text-gray-900 mb-2">{value}</p>
          <p className="text-sm text-gray-500">{subtitle}</p>
        </div>
        {Icon && (
          <div className={`p-3 rounded-full ${accentColor}`}>
            <Icon className="w-6 h-6 text-gray-700" />
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;