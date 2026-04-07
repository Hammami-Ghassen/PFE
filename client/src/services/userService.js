export const getUsers = async (axiosPrivate, { page = 0, size = 10, search = '', codSoc = '' } = {}) => {
  const params = { page, size };
  if (search) params.search = search;
  if (codSoc) params.codSoc = codSoc;
  const response = await axiosPrivate.get('/admin/personnel', { params });
  return response.data.data; // Page<PersonnelAdminResponse>
};

export const getEstablishments = async (axiosPrivate) => {
  const response = await axiosPrivate.get('/admin/personnel/establishments');
  return response.data.data;
};

export const updatePersonnelRole = async (axiosPrivate, matPers, codUser) => {
  const response = await axiosPrivate.patch(`/admin/personnel/${matPers}/role`, { codUser });
  return response.data.data;
};

export const getUserById = async (axiosPrivate, id) => {
  const response = await axiosPrivate.get(`/admin/users/${id}`);
  return response.data.data;
};

export const createUser = async (axiosPrivate, data) => {
  const response = await axiosPrivate.post('/admin/users', data);
  return response.data.data; // { user, generatedPassword }
};

export const updateUser = async (axiosPrivate, id, data) => {
  const response = await axiosPrivate.put(`/admin/users/${id}`, data);
  return response.data.data;
};

export const toggleUserStatus = async (axiosPrivate, id) => {
  const response = await axiosPrivate.patch(`/admin/users/${id}/toggle-status`);
  return response.data.data;
};

export const deleteUser = async (axiosPrivate, id) => {
  await axiosPrivate.delete(`/admin/users/${id}`);
};

export const resetUserPassword = async (axiosPrivate, id) => {
  const response = await axiosPrivate.post(`/admin/users/${id}/reset-password`);
  return response.data.data; // { generatedPassword }
};

export const getUserStats = async (axiosPrivate) => {
  const response = await axiosPrivate.get('/admin/personnel', { params: { page: 0, size: 1 } });
  const total = response.data.data.totalElements || 0;
  return { total, active: total, inactive: 0 };
};
