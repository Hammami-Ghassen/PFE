export const getUsers = async (axiosPrivate, { page = 0, size = 50, search = '', codSoc = '' } = {}) => {
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

export const getUserDetails = async (axiosPrivate, matPers) => {
  const response = await axiosPrivate.get(`/admin/personnel/${matPers}`);
  return response.data.data;
};

export const updatePersonnel = async (axiosPrivate, matPers, payload) => {
  const response = await axiosPrivate.patch(`/admin/personnel/${matPers}`, payload);
  return response.data.data;
};

export const updatePersonnelRole = async (axiosPrivate, matPers, codUser) => {
  const response = await axiosPrivate.patch(`/admin/personnel/${matPers}/role`, { codUser });
  return response.data.data;
};
