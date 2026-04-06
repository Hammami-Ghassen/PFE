import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { refreshToken as refreshTokenService } from '../../services/authService';
import { TOKEN_KEY } from '../../utils/constants';
import Spinner from '../ui/Spinner';
import axiosInstance from '../../api/axios';

const PersistLogin = () => {
  const { auth, setSession } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tryRefresh = async () => {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      if (!storedToken) {
        setLoading(false);
        return;
      }
      try {
        const data = await refreshTokenService(storedToken);
        localStorage.setItem(TOKEN_KEY, data.refreshToken);
        // Fetch user profile
        const meRes = await axiosInstance.get('/auth/me', {
          headers: { Authorization: `Bearer ${data.accessToken}` },
        });
        setSession(data.accessToken, meRes.data.data);
      } catch {
        localStorage.removeItem(TOKEN_KEY);
      } finally {
        setLoading(false);
      }
    };

    if (!auth.isAuthenticated) {
      tryRefresh();
    } else {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Spinner size="lg" />
      </div>
    );
  }

  return <Outlet />;
};

export default PersistLogin;
