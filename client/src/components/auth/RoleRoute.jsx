import React from 'react';
import useAuth from '../../hooks/useAuth';
import GuardedRoute from './GuardedRoute';

const RoleRoute = ({ allowedRoles = [] }) => {
  const { auth } = useAuth();

  // Uses the shared guard wrapper so role-based redirects stay consistent across route types.
  return <GuardedRoute allow={allowedRoles.includes(auth.user?.role)} redirectTo="/dashboard" />;
};

export default RoleRoute;
