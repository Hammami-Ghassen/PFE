import axiosInstance from '../api/axios';
import { TOKEN_KEY } from '../utils/constants';

export const login = async (cin, password) => {
  const response = await axiosInstance.post('/auth/login', { cin, password });
  return response.data.data; // { accessToken, refreshToken, tokenType, expiresIn, user }
};

export const refreshToken = async (token) => {
  const response = await axiosInstance.post('/auth/refresh', { refreshToken: token });
  return response.data.data; // { accessToken, refreshToken, ... }
};

export const logout = async (axiosPrivate) => {
  await axiosPrivate.post('/auth/logout');
};

export const getMe = async (axiosPrivate) => {
  const response = await axiosPrivate.get('/auth/me');
  return response.data.data;
};
