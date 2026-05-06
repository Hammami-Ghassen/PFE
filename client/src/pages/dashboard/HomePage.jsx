import React, { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import useAuth from '../../hooks/useAuth';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import NewsSlider from '../../components/ui/NewsSlider';
import { getMyNotifications } from '../../services/notificationService';
import { InformationCircleIcon, ExclamationTriangleIcon, ChatBubbleLeftIcon, CalendarIcon, BellIcon } from '@heroicons/react/24/outline';

const HomePage = () => {
  const { auth } = useAuth();
  const axiosPrivate = useAxiosPrivate();
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [loadingNotifs, setLoadingNotifs] = useState(true);

  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const response = await getMyNotifications(axiosPrivate);
        if (response.success) {
          // Ne garder que les 5 plus récentes
          setRecentNotifications(response.data.slice(0, 5));
        }
      } catch (err) {
        console.error("Erreur lors du chargement des notifications.", err);
      } finally {
        setLoadingNotifs(false);
      }
    };
    fetchNotifs();
  }, [axiosPrivate]);

  const getIcon = (type) => {
    switch (type) {
      case 'INFO': return <InformationCircleIcon className="w-5 h-5 text-blue-500" />;
      case 'ALERT': return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />;
      case 'MESSAGE': return <ChatBubbleLeftIcon className="w-5 h-5 text-green-500" />;
      case 'LEAVE_UPDATE': return <CalendarIcon className="w-5 h-5 text-purple-500" />;
      default: return <BellIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Bienvenue, {auth?.user?.firstName || auth?.user?.matPers}</h1>
        <p className="text-gray-600">
          Bienvenue sur le portail des ressources humaines du Ministère de la Santé Publique.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <NewsSlider />
        </div>
        
        <div className="flex flex-col gap-6">
          <div className="bg-white shadow rounded-lg p-6 flex-1 flex flex-col">
            <h2 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100 shrink-0">Notifications Récentes</h2>
            
            <div className="flex-1 overflow-y-auto pr-2">
              {loadingNotifs ? (
                <div className="flex justify-center py-6">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-ministere-600"></div>
                </div>
              ) : recentNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                  <BellIcon className="w-12 h-12 mb-2 opacity-50" />
                  <p className="text-sm">Aucune notification</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {recentNotifications.map((notif) => (
                    <li key={notif.id} className={`flex items-start gap-3 p-3 rounded-lg border ${notif.isRead ? 'bg-gray-50 border-gray-100 opacity-80' : 'bg-blue-50 border-blue-100'}`}>
                      <div className="shrink-0 mt-0.5">{getIcon(notif.type)}</div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm ${notif.isRead ? 'text-gray-600' : 'font-medium text-gray-900'} line-clamp-2`}>
                          {notif.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true, locale: fr })}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
