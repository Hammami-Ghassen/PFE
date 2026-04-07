import React from 'react';
import { ROLES } from '../../utils/constants';
import RoleRoute from './RoleRoute';

// Keeps admin protection as a semantic wrapper over the shared role-guard behavior.
const AdminRoute = () => <RoleRoute allowedRoles={[ROLES.ADMIN]} />;

export default AdminRoute;
