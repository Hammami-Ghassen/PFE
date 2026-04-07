import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';

const RoleRoute = ({ allowedRoles = [] }) => {
  const { auth } = useAuth();

  if (!allowedRoles.includes(auth.user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default RoleRoute;
