import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import PersistLogin from './components/auth/PersistLogin';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AdminRoute from './components/auth/AdminRoute';
import RoleRoute from './components/auth/RoleRoute';
import DashboardLayout from './components/layout/DashboardLayout';

import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import PowerBIDashboard from './pages/dashboard/PowerBIDashboard';
import UsersListPage from './pages/admin/UsersListPage';
import AddEmployeePage from './pages/admin/AddEmployeePage';
import CorrectionRequestsPage from './pages/admin/CorrectionRequestsPage';
import LeaveSubmitPage from './pages/leave/LeaveSubmitPage';
import MyLeaveRequestsPage from './pages/leave/MyLeaveRequestsPage';
import LeaveValidationPage from './pages/leave/LeaveValidationPage';
import { ROLES } from './utils/constants';

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
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />

              <Route element={<RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.DIRECTEUR]} />}>
                <Route path="/powerbi-dashboard" element={<PowerBIDashboard />} />
              </Route>

              <Route element={<RoleRoute allowedRoles={[ROLES.AGENT, ROLES.DIRECTEUR]} />}>
                <Route path="/leave/submit" element={<LeaveSubmitPage />} />
                <Route path="/leave/my-requests" element={<MyLeaveRequestsPage />} />
              </Route>

              <Route element={<RoleRoute allowedRoles={[ROLES.DIRECTEUR]} />}>
                <Route path="/leave/validation" element={<LeaveValidationPage />} />
              </Route>

              {/* Admin only */}
              <Route element={<AdminRoute />}>
                <Route path="/admin/users" element={<UsersListPage />} />
                <Route path="/admin/corrections" element={<CorrectionRequestsPage />} />
                <Route path="/admin/employees/new" element={<AddEmployeePage />} />
              </Route>
            </Route>
          </Route>
        </Route>

        {/* 404 */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  );
}

export default App;
