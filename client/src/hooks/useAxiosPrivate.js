import { useEffect } from 'react';
import { axiosPrivate } from '../api/axios';
import useAuth from './useAuth';
import { refreshToken as refreshTokenService } from '../services/authService';
import axiosInstance from '../api/axios';
import { runRefreshQueue } from '../api/axiosRetryQueue';

const refreshSession = async (existingUser, setSession) => {
  const tokenData = await refreshTokenService();
  let user = existingUser;

  if (!user) {
    const meRes = await axiosInstance.get('/auth/me', {
      headers: { Authorization: `Bearer ${tokenData.accessToken}` },
    });
    user = meRes.data.data;
  }

  setSession(tokenData.accessToken, user);
  return tokenData.accessToken;
};

const useAxiosPrivate = () => {
  const { auth, setSession, clearSession } = useAuth();

  // Keeps the hook focused on interceptor wiring while queue logic lives in api/axiosRetryQueue.
  useEffect(() => {
    const requestIntercept = axiosPrivate.interceptors.request.use(
      (config) => {
        if (!config.headers['Authorization'] && auth.accessToken) {
          config.headers['Authorization'] = `Bearer ${auth.accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    const responseIntercept = axiosPrivate.interceptors.response.use(
      (response) => response,
      async (error) => {
        const prevRequest = error?.config;
        if (
          error?.response?.status === 401
          && !prevRequest?._retry
          && !String(prevRequest?.url || '').includes('/auth/refresh')
        ) {
          prevRequest._retry = true;
          try {
            const accessToken = await runRefreshQueue(() => refreshSession(auth.user, setSession));
            prevRequest.headers = prevRequest.headers || {};
            prevRequest.headers.Authorization = `Bearer ${accessToken}`;
            return axiosPrivate(prevRequest);
          } catch (refreshError) {
            clearSession();
            return Promise.reject(refreshError);
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axiosPrivate.interceptors.request.eject(requestIntercept);
      axiosPrivate.interceptors.response.eject(responseIntercept);
    };
  }, [auth, setSession, clearSession]);

  return axiosPrivate;
};

export default useAxiosPrivate;
