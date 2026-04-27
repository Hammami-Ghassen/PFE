import React from 'react';
import { ClockIcon, HeartIcon } from '@heroicons/react/24/outline';

const LeaveBalanceCard = ({ title, balance, total, type, subtitle, icon: Icon }) => {
  const isSickLeave = type === 'sick';
  const colorClass = isSickLeave ? 'bg-red-50' : 'bg-blue-50';
  const textColor = isSickLeave ? 'text-red-600' : 'text-blue-600';
  const titleColor = isSickLeave ? 'text-red-900' : 'text-blue-900';

  return (
    <div className={`${colorClass} rounded-xl p-6 flex flex-col justify-between shadow-sm relative overflow-hidden transition-all duration-200 hover:shadow-md`}>
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-3 relative z-10">
          <div className={`p-2 rounded-lg bg-white/60 shadow-sm ${textColor}`}>
            {Icon ? <Icon className="w-5 h-5" /> : (isSickLeave ? <HeartIcon className="w-5 h-5" /> : <ClockIcon className="w-5 h-5" />)}
          </div>
          <h3 className={`font-semibold text-lg ${titleColor}`}>{title}</h3>
        </div>
        {total && (
          <span className="bg-white/60 px-3 py-1 rounded-full text-xs font-bold text-gray-600 shadow-sm">
            {total} Total
          </span>
        )}
      </div>

      <div className="flex items-end gap-3 relative z-10">
        <span className={`text-6xl font-extrabold tracking-tight ${textColor}`}>{balance}</span>
      </div>
      
      {subtitle && (
        <div className="mt-4 pt-4 border-t border-black/5 relative z-10">
          <p className="text-sm text-gray-600 font-medium">{subtitle}</p>
        </div>
      )}
    </div>
  );
};

export default LeaveBalanceCard;