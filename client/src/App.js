import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import useAuth from './hooks/useAuth';
import PersistLogin from './components/auth/PersistLogin';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AdminRoute from './components/auth/AdminRoute';
import RoleRoute from './components/auth/RoleRoute';
import DashboardLayout from './components/layout/DashboardLayout';

import LoginPage from './pages/auth/LoginPage';
import HomePage from './pages/dashboard/HomePage';
import DashboardPage from './pages/dashboard/DashboardPage';
import PowerBIDashboard from './pages/dashboard/PowerBIDashboard';
import UsersListPage from './pages/admin/UsersListPage';
import MAJRequestsPage from './pages/admin/MAJRequestsPage';
import MyLeaveRequestsPage from './pages/leave/MyLeaveRequestsPage';
import LeaveValidationPage from './pages/leave/LeaveValidationPage';
import ChatPage from './pages/chat/ChatPage';
import { getDefaultRouteForRole, ROLES } from './utils/constants';

const DefaultRouteRedirect = () => {
  const { auth } = useAuth();
  return <Navigate to={getDefaultRouteForRole(auth.user?.role)} replace />;
};

function App() {
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: { fontSize: '14px', maxWidth: '420px' },
        }}
      />
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected */}
        <Route element={<PersistLogin />}>
          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/" element={<DefaultRouteRedirect />} />
              <Route path="/home" element={<HomePage />} />
              <Route path="/chat" element={<ChatPage />} />

              <Route element={<RoleRoute allowedRoles={[ROLES.AGENT, ROLES.DIRECTEUR]} />}>
                <Route path="/dashboard" element={<DashboardPage />} />
              </Route>

              <Route element={<RoleRoute allowedRoles={[ROLES.DIRECTEUR]} />}>
                <Route path="/powerbi-dashboard" element={<PowerBIDashboard />} />
              </Route>

              <Route element={<RoleRoute 
                allowedRoles={[ROLES.AGENT, ROLES.DIRECTEUR]} 
                customCheck={(user) => !(user?.role === ROLES.DIRECTEUR && user?.codSoc === '0001')}
              />}>
                <Route path="/leave/my-requests" element={<MyLeaveRequestsPage />} />
              </Route>

              <Route element={<RoleRoute allowedRoles={[ROLES.DIRECTEUR]} />}>
                <Route path="/leave/validation" element={<LeaveValidationPage />} />
              </Route>

              {/* Admin only */}
              <Route element={<AdminRoute />}>
                <Route path="/admin/users" element={<UsersListPage />} />
                <Route path="/admin/mise-a-jour" element={<MAJRequestsPage />} />
              </Route>
            </Route>
          </Route>
        </Route>

        {/* 404 */}
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </>
  );
}

export default App;
