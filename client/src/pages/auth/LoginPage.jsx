import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuth from '../../hooks/useAuth';
import { login } from '../../services/authService';
import { TOKEN_KEY } from '../../utils/constants';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';

const LoginPage = () => {
  const [cin, setCin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { setSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!/^\d{8}$/.test(cin)) {
      setError('Le CIN doit contenir exactement 8 chiffres.');
      return;
    }

    setLoading(true);
    try {
      const data = await login(cin, password);
      localStorage.setItem(TOKEN_KEY, data.refreshToken);
      setSession(data.accessToken, data.user);
      toast.success(`Bienvenue, ${data.user.prenom} ${data.user.nom} !`);
      navigate(from, { replace: true });
    } catch (err) {
      const msg =
        err?.response?.data?.message || 'CIN ou mot de passe incorrect.';
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

          <Input
            id="cin"
            label="N° CIN"
            type="text"
            placeholder="Ex: 12345678"
            maxLength={8}
            value={cin}
            onChange={(e) => setCin(e.target.value.replace(/\D/g, ''))}
            required
          />

          <Input
            id="password"
            label="Mot de passe"
            type="password"
            placeholder="Votre mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Button type="submit" loading={loading} className="w-full" size="lg">
            Se connecter
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-gray-400">
          ⓘ Contactez l'administrateur pour obtenir vos identifiants.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
