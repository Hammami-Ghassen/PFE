import React, { useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidthClass = 'max-w-lg',
  bodyClassName = '',
}) => {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Panel */}
      <div className={`relative bg-white rounded-xl shadow-2xl w-full flex flex-col max-h-full ${maxWidthClass} z-10`}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-800 pr-2 truncate">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all flex-shrink-0"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        {/* Body */}
        <div className={`px-4 sm:px-6 py-5 overflow-y-auto ${bodyClassName}`}>{children}</div>
        {/* Footer */}
        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-3 px-4 sm:px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-xl flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;