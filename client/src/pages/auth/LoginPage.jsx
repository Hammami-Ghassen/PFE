import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuth from '../../hooks/useAuth';
import { requestOtp, verifyOtp } from '../../services/authService';
import axiosInstance from '../../api/axios';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import LoginMatPersStep from '../../components/auth/LoginMatPersStep';
import LoginOtpStep from '../../components/auth/LoginOtpStep';

const LoginPage = () => {
  const [step, setStep] = useState(1);
  const [matPers, setMatPers] = useState('');
  const [channel, setChannel] = useState('EMAIL');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { setSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!/^\d{8}$/.test(matPers)) {
      setError('MAT_PERS doit contenir exactement 8 chiffres.');
      return;
    }

    setLoading(true);
    try {
      if (step === 1) {
        await requestOtp(matPers, channel);
        toast.success('OTP envoyé. Vérifiez votre canal sélectionné.');
        setStep(2);
      } else {
        const authData = await verifyOtp(matPers, otp);
        const meRes = await axiosInstance.get('/auth/me', {
          headers: { Authorization: `Bearer ${authData.accessToken}` },
        });
        const user = meRes.data.data;
        const displayName = user.fullName || [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.matPers;
        setSession(authData.accessToken, user);
        toast.success(`Bienvenue ${displayName}`);
        navigate(from, { replace: true });
      }
    } catch (err) {
      const msg = err?.response?.data?.message || 'Impossible de se connecter.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-ministere-700 via-ministere-800 to-ministere-900 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <img
            src="/Logo_Ministère_de_la_santé_Tunisie_تونس_وزارة_الصحة.svg.png"
            alt="Ministère de la Santé"
            className="w-20 h-20 object-contain mb-4"
          />
          <h1 className="text-2xl font-bold text-ministere-700 text-center">
            Ministère de la Santé
          </h1>
          <p className="text-sm text-gray-500 mt-1">Système de Gestion</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <Alert type="error" message={error} />}

          {/* Step-specific UI is now delegated to small presentational components to keep container logic focused. */}
          {step === 1 ? (
            <LoginMatPersStep
              matPers={matPers}
              channel={channel}
              onMatPersChange={(e) => setMatPers(e.target.value.replace(/\D/g, ''))}
              onChannelChange={(e) => setChannel(e.target.value)}
            />
          ) : (
            <LoginOtpStep
              otp={otp}
              onOtpChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              onBack={() => setStep(1)}
            />
          )}

          <Button type="submit" loading={loading} className="w-full" size="lg">
            {step === 1 ? 'Envoyer OTP' : 'Vérifier OTP'}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-gray-400">
          ⓘ Utilisez votre MAT_PERS et un OTP Email/SMS.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
