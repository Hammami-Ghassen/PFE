import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  HomeIcon,
  ChartBarIcon,
  UsersIcon,
  UserPlusIcon,
  ClipboardDocumentListIcon,
  DocumentPlusIcon,
  CalendarDaysIcon,
  ClipboardDocumentCheckIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';
import Logo from './Logo';
import useAuth from '../../hooks/useAuth';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import { logout } from '../../services/authService';
import { ROLES } from '../../utils/constants';

const navItems = [
  { label: 'Mes Informations', to: '/dashboard', icon: HomeIcon, roles: [ROLES.ADMIN, ROLES.DIRECTEUR, ROLES.AGENT] },
  { label: 'Tableau de bord', to: '/powerbi-dashboard', icon: ChartBarIcon, roles: [ROLES.ADMIN, ROLES.DIRECTEUR] },
  { label: 'Deposer un conge', to: '/leave/submit', icon: DocumentPlusIcon, roles: [ROLES.AGENT, ROLES.DIRECTEUR] },
  { label: 'Mes demandes de conge', to: '/leave/my-requests', icon: CalendarDaysIcon, roles: [ROLES.AGENT, ROLES.DIRECTEUR] },
  { label: 'Validation conges', to: '/leave/validation', icon: ClipboardDocumentCheckIcon, roles: [ROLES.DIRECTEUR] },
  { label: 'Personnel', to: '/admin/users', icon: UsersIcon, roles: [ROLES.ADMIN] },
  { label: 'Demandes correction', to: '/admin/corrections', icon: ClipboardDocumentListIcon, roles: [ROLES.ADMIN] },
  { label: 'Ajouter Employe', to: '/admin/employees/new', icon: UserPlusIcon, roles: [ROLES.ADMIN] },
];

const Sidebar = () => {
  const { auth, clearSession } = useAuth();
  const axiosPrivate = useAxiosPrivate();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout(axiosPrivate);
    } catch {
      // ignore
    } finally {
      clearSession();
      navigate('/login');
    }
  };

  const userRole = auth.user?.role;

  return (
    <aside className="bg-ministere-900 text-white w-64 h-full flex flex-col flex-shrink-0">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-ministere-800 shrink-0">
        <Logo size="md" showText />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto">
        {navItems
          .filter((item) => item.roles.includes(userRole))
          .map(({ label, to, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-3 text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-ministere-800 text-white border-l-4 border-red-600'
                    : 'text-ministere-100 hover:bg-ministere-800/50 hover:text-white border-l-4 border-transparent'
                }`
              }
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
      </nav>

      {/* Logout */}
      <div className="px-4 py-6 border-t border-ministere-800 space-y-2 shrink-0">
        <button
          className="flex items-center gap-3 w-full px-3 py-3 text-sm font-medium text-ministere-100 hover:bg-ministere-800/50 hover:text-white transition-all duration-150 border-l-4 border-transparent"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Help Center
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-3 text-sm font-medium text-ministere-100 hover:bg-red-500/20 hover:text-red-300 transition-all duration-150 border-l-4 border-transparent"
        >
          <ArrowRightOnRectangleIcon className="w-5 h-5" />
          Déconnexion
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
