import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { HomeIcon, ChartBarIcon, AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';
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
  const [resendTimer, setResendTimer] = useState(0);

  const { setSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleResendOtp = useCallback(async () => {
    if (resendTimer > 0) return;
    setError('');
    const id = toast.loading('Renvoi de l\'OTP...');
    try {
      await requestOtp(matPers, channel);
      toast.success('Nouvel OTP envoyé.', { id });
      setResendTimer(60);
    } catch (err) {
      toast.error('Échec du renvoi de l\'OTP.', { id });
      setError(err?.response?.data?.message || 'Impossible de renvoyer l\'OTP.');
    }
  }, [resendTimer, matPers, channel]);

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
        setResendTimer(60);
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
    <div className="flex flex-col md:flex-row min-h-screen">
      {/* Left Panel: Branding & Navigation Preview */}
      <div className="hidden md:flex md:w-[35%] lg:w-[30%] bg-ministere-900 text-white flex-col relative px-10 py-12">
        <div className="flex items-center gap-4 border-b border-white/20 pb-6 mb-8">
          <img
            src="/Logo_Ministère_de_la_santé_Tunisie_تونس_وزارة_الصحة.svg.png"
            alt="Ministère de la Santé"
            className="w-16 h-16 object-contain bg-white rounded p-1"
          />
          <div>
            <h2 className="text-xl font-bold tracking-wider">MINISTÈRE</h2>
            <h3 className="text-lg font-light tracking-widest text-slate-300">DE LA SANTÉ</h3>
          </div>
        </div>

        <h1 className="text-2xl font-semibold mb-3">GESTION DES COMPÉTENCES HUMAINES</h1>
        <p className="text-slate-400 text-sm leading-relaxed mb-10">
          La plateforme digitale de référence pour la gestion, l'évaluation et le suivi des ressources humaines du ministère.
        </p>

        <div className="space-y-3 mt-4 flex-1">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-4 hover:bg-white/10 transition-colors">
            <div className="bg-white/10 p-2 rounded-lg text-white">
              <HomeIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="font-medium text-sm">Gestion du Personnel</p>
              <p className="text-xs text-slate-400 line-clamp-1">Suivi administratif et dossiers individuels</p>
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-4 hover:bg-white/10 transition-colors">
            <div className="bg-white/10 p-2 rounded-lg text-white">
              <ChartBarIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="font-medium text-sm">Outils d'Évaluation</p>
              <p className="text-xs text-slate-400 line-clamp-1">Simulez et évaluez les postes de travail</p>
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-4 hover:bg-white/10 transition-colors">
            <div className="bg-white/10 p-2 rounded-lg text-white">
              <AdjustmentsHorizontalIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="font-medium text-sm">Tableau de Bord</p>
              <p className="text-xs text-slate-400 line-clamp-1">Indicateurs en temps réel des ressources</p>
            </div>
          </div>
        </div>

        <div className="text-xs text-slate-500 mt-auto pt-6">
          © {new Date().getFullYear()} Ministère de la Santé - Tunisie
        </div>
      </div>

      {/* Right Panel: Login Form / Hero Image */}
      <div className="flex-1 relative flex items-center justify-center bg-gray-50 md:bg-transparent">
        {/* Background Image Setup */}
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/bg.jpg')" }}
        />
        {/* Optional overlay to make form stand out more against generic bg */}
        <div className="absolute inset-0 z-0 bg-ministere-900/60 md:bg-ministere-900/20 backdrop-blur-[2px]"></div>

        <div className="relative z-10 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-sm p-8 sm:p-10 mx-4">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Connexion</h2>
            <p className="text-sm text-gray-500 mt-1">Accédez à votre espace professionnel</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && <Alert type="error" message={error} />}

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
                onBack={() => { setStep(1); setResendTimer(0); }}
                onResend={handleResendOtp}
                resendTimer={resendTimer}
              />
            )}

            <Button type="submit" loading={loading} variant="danger" className="w-full font-semibold" size="lg">
              {step === 1 ? 'Se connecter' : 'Vérifier OTP'}
            </Button>
            
            
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;