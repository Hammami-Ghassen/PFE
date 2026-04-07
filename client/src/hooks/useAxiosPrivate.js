import { useEffect } from 'react';
import { axiosPrivate } from '../api/axios';
import useAuth from './useAuth';
import { refreshToken as refreshTokenService } from '../services/authService';
import { getMe } from '../services/authService';

const useAxiosPrivate = () => {
  const { auth, setSession, clearSession } = useAuth();

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
        if (error?.response?.status === 401 && !prevRequest?._retry) {
          prevRequest._retry = true;
          try {
            const data = await refreshTokenService();
            let user = auth.user;
            if (!user) {
              user = await getMe(axiosPrivate);
            }
            setSession(data.accessToken, user);
            prevRequest.headers['Authorization'] = `Bearer ${data.accessToken}`;
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
