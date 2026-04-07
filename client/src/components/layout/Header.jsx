import React from 'react';
import { UserCircleIcon } from '@heroicons/react/24/outline';
import useAuth from '../../hooks/useAuth';
import Badge from '../ui/Badge';

const Header = ({ title }) => {
  const { auth } = useAuth();
  const user = auth.user;

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
      <h1 className="text-xl font-semibold text-gray-800">{title}</h1>
      <div className="flex items-center gap-3">
        <Badge label={user?.role} />
        <div className="flex items-center gap-2">
          <UserCircleIcon className="w-8 h-8 text-ministere-500" />
          <div className="hidden sm:block leading-tight">
            <p className="text-sm font-medium text-gray-700">{user?.matPers}</p>
            <p className="text-xs text-gray-400">COD_USER: {user?.codUser || '—'}</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
