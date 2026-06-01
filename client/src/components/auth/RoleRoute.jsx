import React from 'react';
import useAuth from '../../hooks/useAuth';
import GuardedRoute from './GuardedRoute';
import { getDefaultRouteForRole } from '../../utils/constants';

const RoleRoute = ({ allowedRoles = [], customCheck = () => true }) => {
  const { auth } = useAuth();

  // Uses the shared guard wrapper so role-based redirects stay consistent across route types.
  return (
    <GuardedRoute
      allow={allowedRoles.includes(auth.user?.role) && customCheck(auth.user)}
      redirectTo={getDefaultRouteForRole(auth.user?.role)}
    />
  );
};

export default RoleRoute;
