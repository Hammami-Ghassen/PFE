import React, { useState, useEffect, useRef } from 'react';
import { UserCircleIcon, MagnifyingGlassIcon, BellIcon, Cog8ToothIcon } from '@heroicons/react/24/outline';
import useAuth from '../../hooks/useAuth';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import { getMyNotifications, markAsRead } from '../../services/notificationService';
import NotificationDropdown from '../ui/NotificationDropdown';

const Header = ({ title }) => {
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
    // Optionnel: polling toutes les 2 minutes pour rafraichir
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
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
      <h1 className="text-xl font-bold text-gray-900 min-w-[200px]">{title || 'Portail RH et Congés'}</h1>
      
      {/* Search Bar - Center */}
      <div className="flex-1 max-w-xl mx-8 relative hidden md:block">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
        </div>
        <input
          className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-md leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-ministere-500 focus:border-ministere-500 sm:text-sm transition-colors"
          placeholder="Rechercher..."
          type="search"
        />
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-4 text-gray-500">
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setShowDropdown(!showDropdown)}
              className="hover:text-ministere-600 transition-colors focus:outline-none relative"
            >
              <BellIcon className="w-6 h-6" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center border-2 border-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
            
            {showDropdown && (
              <NotificationDropdown 
                notifications={notifications} 
                onMarkAsRead={handleMarkAsRead}
                onClose={() => setShowDropdown(false)}
              />
            )}
          </div>
          <button className="hover:text-ministere-600 transition-colors">
            <Cog8ToothIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="h-6 w-px bg-gray-300 mx-2"></div>

        <div className="flex items-center gap-4">
          <p className="text-sm font-medium text-gray-700 hidden sm:block">{displayName || 'Profil'}</p>
          <div className="h-10 w-10 min-w-[40px] rounded-full bg-ministere-800 text-white flex items-center justify-center shadow-inner overflow-hidden border-2 border-white">
            <UserCircleIcon className="w-8 h-8 text-gray-200" />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
