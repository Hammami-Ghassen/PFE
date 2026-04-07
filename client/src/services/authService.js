import axiosInstance from '../api/axios';

export const requestOtp = async (matPers, channel) => {
  const response = await axiosInstance.post('/auth/request-otp', { matPers, channel });
  return response.data;
};

export const verifyOtp = async (matPers, otp) => {
  const response = await axiosInstance.post('/auth/verify-otp', { matPers, otp });
  return response.data.data; // { accessToken, tokenType, expiresIn, matPers, role }
};

export const refreshToken = async () => {
  const response = await axiosInstance.post('/auth/refresh');
  return response.data.data; // { accessToken, tokenType, expiresIn, matPers, role }
};

export const logout = async (axiosPrivate) => {
  await axiosPrivate.post('/auth/logout');
};

export const getMe = async (axiosPrivate) => {
  const response = await axiosPrivate.get('/auth/me');
  return response.data.data;
};
