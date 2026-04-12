import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const pageTitles = {
  '/dashboard': 'Mes Informations',
  '/powerbi-dashboard': 'Tableau de bord',
  '/admin/users': 'Gestion du Personnel',
  '/admin/corrections': 'Demandes de correction',
  '/admin/employees/new': 'Ajout Employe (UI)',
};

const DashboardLayout = () => {
  const location = useLocation();
  const title =
    pageTitles[location.pathname] ||
    (location.pathname.includes('/edit') ? 'Modifier Utilisateur' : 'Système de Gestion');

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title={title} />
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
