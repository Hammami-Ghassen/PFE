import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  HomeIcon,
  UserIcon,
  ChartBarIcon,
  UsersIcon,
  ClipboardDocumentListIcon,
  CalendarDaysIcon,
  ClipboardDocumentCheckIcon,
  ArrowRightOnRectangleIcon,
  ChatBubbleLeftRightIcon,
  Cog6ToothIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import Logo from './Logo';
import useAuth from '../../hooks/useAuth';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import { logout } from '../../services/authService';
import { ROLES } from '../../utils/constants';

const navItems = [
  { label: 'Accueil', to: '/home', icon: HomeIcon, roles: [ROLES.ADMIN, ROLES.DIRECTEUR, ROLES.AGENT] },
  { label: 'Mes Informations', to: '/dashboard', icon: UserIcon, roles: [ROLES.DIRECTEUR, ROLES.AGENT] },
  { label: 'Messages', to: '/chat', icon: ChatBubbleLeftRightIcon, roles: [ROLES.DIRECTEUR, ROLES.AGENT] },
  { label: 'Tableau de bord', to: '/powerbi-dashboard', icon: ChartBarIcon, roles: [ROLES.DIRECTEUR] },
  { label: 'Mes demandes de congé', to: '/leave/my-requests', icon: CalendarDaysIcon, roles: [ROLES.AGENT, ROLES.DIRECTEUR] },
  { label: 'Validation congés', to: '/leave/validation', icon: ClipboardDocumentCheckIcon, roles: [ROLES.DIRECTEUR] },
  { label: 'Personnel', to: '/admin/users', icon: UsersIcon, roles: [ROLES.ADMIN] },
  { label: 'OTP SMTP', to: '/admin/otp-settings', icon: Cog6ToothIcon, roles: [ROLES.ADMIN] },
  { label: 'Demandes de mise à jour', to: '/admin/mise-a-jour', icon: ClipboardDocumentListIcon, roles: [ROLES.ADMIN] },
];

const Sidebar = ({ onClose }) => {
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

  const userRole = auth?.user?.role;

  return (
    <aside className="bg-ministere-900 text-white w-64 h-full flex flex-col flex-shrink-0 relative">
      {/* Mobile close button */}
      <button 
        onClick={onClose}
        className="md:hidden absolute top-4 right-4 text-white hover:text-gray-300 p-2"
      >
        <XMarkIcon className="w-6 h-6" />
      </button>

      {/* Logo */}
      <div className="px-6 py-6 border-b border-ministere-800 shrink-0">
        <Logo size="md" showText />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto">
        {navItems
          .filter((item) => {
            if (!item.roles.includes(userRole)) return false;
            // Hide My leave requests for DIRECTEUR with codSoc 0001
            if (item.to === '/leave/my-requests' && userRole === ROLES.DIRECTEUR && auth?.user?.codSoc === '0001') {
              return false;
            }
            return true;
          })
          .map(({ label, to, icon: Icon }) => (
            <NavLink
              onClick={onClose}
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
              <span className="truncate">{label}</span>
            </NavLink>
          ))}
      </nav>

      {/* Logout */}
      <div className="px-4 py-6 border-t border-ministere-800 space-y-2 shrink-0">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-3 text-sm font-medium text-ministere-100 hover:bg-red-500/20 hover:text-red-300 transition-all duration-150 border-l-4 border-transparent"
        >
          <ArrowRightOnRectangleIcon className="w-5 h-5 flex-shrink-0" />
          <span className="truncate">Déconnexion</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
