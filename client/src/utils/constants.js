export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

export const ROLES = {
  ADMIN: 'ADMIN',
  DIRECTEUR: 'DIRECTEUR',
  AGENT: 'AGENT',
};

export const DEFAULT_ROUTE_BY_ROLE = {
  [ROLES.ADMIN]: '/admin/users',
  [ROLES.DIRECTEUR]: '/home',
  [ROLES.AGENT]: '/home',
};

export const getDefaultRouteForRole = (role) => DEFAULT_ROUTE_BY_ROLE[role] || '/home';
