import React from 'react';
import useAuth from '../../hooks/useAuth';
import GuardedRoute from './GuardedRoute';

const ProtectedRoute = () => {
  const { auth } = useAuth();

  // Shared guard keeps auth redirects consistent while preserving original destination.
  return <GuardedRoute allow={auth.isAuthenticated} redirectTo="/login" preserveFrom />;
};

export default ProtectedRoute;
