import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { BellIcon, InformationCircleIcon, ExclamationTriangleIcon, ChatBubbleLeftIcon, CalendarIcon } from '@heroicons/react/24/outline';

const NotificationDropdown = ({ notifications, onMarkAsRead, onClose }) => {
  if (!notifications || notifications.length === 0) {
    return (
      <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg overflow-hidden z-50 border border-gray-100">
        <div className="p-4 text-center text-gray-500 text-sm">
          Aucune notification
        </div>
      </div>
    );
  }

  const getIcon = (type) => {
    switch (type) {
      case 'INFO':
        return <InformationCircleIcon className="w-6 h-6 text-blue-500" />;
      case 'ALERT':
        return <ExclamationTriangleIcon className="w-6 h-6 text-red-500" />;
      case 'MESSAGE':
        return <ChatBubbleLeftIcon className="w-6 h-6 text-green-500" />;
      case 'LEAVE_UPDATE':
        return <CalendarIcon className="w-6 h-6 text-purple-500" />;
      default:
        return <BellIcon className="w-6 h-6 text-gray-500" />;
    }
  };

  return (
    <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg overflow-hidden z-50 border border-gray-100 flex flex-col max-h-96">
      <div className="p-3 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
        <h3 className="text-sm font-semibold text-gray-700">Notifications</h3>
      </div>
      <div className="overflow-y-auto flex-1">
        {notifications.map((notif) => (
          <div
            key={notif.id}
            onClick={() => {
              if (!notif.isRead) {
                onMarkAsRead(notif.id);
              }
            }}
            className={`p-3 border-b border-gray-50 flex items-start gap-3 transition-colors ${
              notif.isRead 
                ? 'bg-white text-gray-500 opacity-75' 
                : 'bg-blue-50/50 text-gray-900 cursor-pointer hover:bg-blue-50'
            }`}
          >
            <div className="shrink-0 mt-1">
              {getIcon(notif.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm ${notif.isRead ? 'font-normal' : 'font-medium'} whitespace-pre-wrap`}>
                {notif.message}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true, locale: fr })}
              </p>
            </div>
            {!notif.isRead && (
              <div className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-2"></div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotificationDropdown;
