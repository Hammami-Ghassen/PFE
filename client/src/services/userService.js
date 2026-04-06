export const getUsers = async (axiosPrivate, { page = 0, size = 10, search = '' } = {}) => {
  const params = { page, size };
  if (search) params.search = search;
  const response = await axiosPrivate.get('/admin/users', { params });
  return response.data.data; // Page<UserResponse>
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
  const response = await axiosPrivate.get('/admin/users/stats');
  return response.data.data; // { total, active, inactive }
};
