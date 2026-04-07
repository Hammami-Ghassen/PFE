import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuth from '../../hooks/useAuth';
import { requestOtp, verifyOtp } from '../../services/authService';
import axiosInstance from '../../api/axios';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';

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
        setSession(authData.accessToken, user);
        toast.success(`Bienvenue ${user.matPers}`);
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

          {step === 1 ? (
            <>
              <Input
                id="matPers"
                label="Identifiant MAT_PERS"
                type="text"
                placeholder="Ex: 00091651"
                maxLength={8}
                value={matPers}
                onChange={(e) => setMatPers(e.target.value.replace(/\D/g, ''))}
                required
              />
              <div className="flex flex-col gap-1">
                <label htmlFor="channel" className="text-sm font-medium text-gray-700">
                  Canal OTP
                </label>
                <select
                  id="channel"
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ministere-500"
                >
                  <option value="EMAIL">Email</option>
                  <option value="SMS">SMS</option>
                </select>
              </div>
            </>
          ) : (
            <>
              <Input
                id="otp"
                label="Code OTP (6 chiffres)"
                type="text"
                placeholder="Ex: 123456"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                required
              />
              <Button type="button" variant="secondary" className="w-full" onClick={() => setStep(1)}>
                Retour
              </Button>
            </>
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
