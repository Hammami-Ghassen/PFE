import axios from 'axios';
import { API_BASE_URL, TOKEN_KEY } from '../utils/constants';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

export default axiosInstance;

// axiosPrivate is created fresh in useAxiosPrivate hook (with interceptors)
export const axiosPrivate = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});
