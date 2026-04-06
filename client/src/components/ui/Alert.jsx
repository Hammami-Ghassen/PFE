import React from 'react';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

const icons = {
  success: <CheckCircleIcon className="w-5 h-5 text-accent-green" />,
  warning: <ExclamationTriangleIcon className="w-5 h-5 text-accent-orange" />,
  info: <InformationCircleIcon className="w-5 h-5 text-ministere-500" />,
  error: <XCircleIcon className="w-5 h-5 text-accent-red" />,
};

const styles = {
  success: 'bg-green-50 border-green-200 text-green-800',
  warning: 'bg-orange-50 border-orange-200 text-orange-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
  error: 'bg-red-50 border-red-200 text-red-800',
};

const Alert = ({ type = 'info', message, className = '' }) => (
  <div className={`flex items-start gap-3 px-4 py-3 rounded-lg border text-sm ${styles[type]} ${className}`}>
    {icons[type]}
    <span>{message}</span>
  </div>
);

export default Alert;
