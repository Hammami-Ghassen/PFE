import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  HomeIcon,
  ChartBarIcon,
  UsersIcon,
  UserPlusIcon,
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
  { label: 'Personnel', to: '/admin/users', icon: UsersIcon, roles: [ROLES.ADMIN] },
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
    <aside className="bg-ministere-700 text-white w-64 min-h-screen flex flex-col flex-shrink-0">
      {/* Logo */}
      <div className="px-5 py-6 border-b border-ministere-600">
        <Logo size="md" showText />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems
          .filter((item) => item.roles.includes(userRole))
          .map(({ label, to, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-ministere-600 text-white'
                    : 'text-ministere-100 hover:bg-ministere-600/60 hover:text-white'
                }`
              }
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-ministere-600">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-ministere-100 hover:bg-red-500/20 hover:text-red-300 transition-all duration-150"
        >
          <ArrowRightOnRectangleIcon className="w-5 h-5" />
          Déconnexion
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
