import React, { useState, useEffect, useRef } from 'react';
import { UserCircleIcon, BellIcon, Bars3Icon } from '@heroicons/react/24/outline';
import useAuth from '../../hooks/useAuth';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import { getMyNotifications, markAsRead } from '../../services/notificationService';
import NotificationDropdown from '../ui/NotificationDropdown';

const Header = ({ title, onMenuClick }) => {
  const { auth } = useAuth();
  const axiosPrivate = useAxiosPrivate();
  const user = auth.user;
  const displayName = user?.fullName || [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || user?.matPers;

  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const response = await getMyNotifications(axiosPrivate);
      if (response.success) {
        setNotifications(response.data);
      }
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 120000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      const response = await markAsRead(axiosPrivate, id);
      if (response.success) {
        setNotifications(prev => 
          prev.map(n => n.id === id ? { ...n, isRead: true } : n)
        );
      }
    } catch (err) {
      console.error("Failed to mark as read", err);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10 w-full overflow-hidden">
      <div className="flex items-center">
        <button
          onClick={onMenuClick}
          className="mr-3 md:hidden rounded-md p-2 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-ministere-500"
        >
          <span className="sr-only">Ouvrir le menu</span>
          <Bars3Icon className="h-6 w-6 text-gray-600" />
        </button>
        <h1 className="text-lg md:text-xl font-bold text-gray-900 truncate">
          {title || 'Portail RH'}
        </h1>
      </div>

      <div className="flex items-center gap-3 md:gap-6 flex-shrink-0">
        <div className="flex items-center text-gray-500">
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setShowDropdown(!showDropdown)}
              className="hover:text-ministere-600 transition-colors focus:outline-none relative p-1"
            >
              <BellIcon className="w-6 h-6" />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center border-2 border-white transform translate-x-1/4 -translate-y-1/4">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
            
            {showDropdown && (
              <div className="absolute right-0 mt-2 w-72 sm:w-80 z-50">
                <NotificationDropdown 
                  notifications={notifications} 
                  onMarkAsRead={handleMarkAsRead}
                  onClose={() => setShowDropdown(false)}
                />
              </div>
            )}
          </div>
        </div>

        <div className="hidden sm:block h-6 w-px bg-gray-300 mx-2"></div>

        <div className="flex items-center gap-2 md:gap-4">
          <p className="text-sm font-medium text-gray-700 hidden lg:block truncate max-w-[150px]">
            {displayName || 'Profil'}
          </p>
          <div className="h-8 w-8 md:h-10 md:w-10 min-w-[32px] md:min-w-[40px] rounded-full bg-ministere-800 text-white flex items-center justify-center shadow-inner overflow-hidden border-2 border-white">
            <UserCircleIcon className="h-full w-full text-gray-200" />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
