import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const pageTitles = {
  '/dashboard': 'Mes Informations',
  '/powerbi-dashboard': 'Tableau de bord',
  '/leave/my-requests': 'Mes demandes de conge',
  '/leave/validation': 'Validation des conges',
  '/admin/users': 'Gestion du Personnel',
  '/admin/mise-a-jour': 'Demandes de mise à jour',
  '/home': 'Accueil',
  '/chat': 'Messagerie',
};

const DashboardLayout = () => {
  const location = useLocation();
  const title =
    pageTitles[location.pathname];

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 relative">
      {/* Mobile sidebar overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - responsive container */}
      <div
        className={`fixed inset-y-0 left-0 z-30 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar onClose={() => setIsSidebarOpen(false)} />
      </div>

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Header title={title} onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="flex-1 p-4 md:p-6 overflow-y-auto overflow-x-hidden w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
