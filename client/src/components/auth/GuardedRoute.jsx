import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

// Shared guard wrapper keeps route protection behavior consistent across auth and role checks.
const GuardedRoute = ({ allow, redirectTo, preserveFrom = false }) => {
  const location = useLocation();

  if (!allow) {
    const state = preserveFrom ? { from: location } : undefined;
    return <Navigate to={redirectTo} state={state} replace />;
  }

  return <Outlet />;
};

export default GuardedRoute;
