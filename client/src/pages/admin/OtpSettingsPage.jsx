import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  CheckCircleIcon,
  EnvelopeIcon,
  KeyIcon,
  PaperAirplaneIcon,
  ServerIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import {
  getOtpMailSettings,
  sendOtpMailTest,
  updateOtpMailSettings,
} from '../../services/otpMailSettingsService';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Spinner from '../../components/ui/Spinner';

const initialForm = {
  host: '',
  port: 587,
  username: '',
  password: '',
  smtpAuth: true,
  securityMode: 'STARTTLS',
  fromAddress: '',
};

const securityOptions = [
  { value: 'NONE', label: 'Aucune', port: 25 },
  { value: 'STARTTLS', label: 'STARTTLS', port: 587 },
  { value: 'SSL_TLS', label: 'SSL / TLS', port: 465 },
];

const OtpSettingsPage = () => {
  const axiosPrivate = useAxiosPrivate();
  const [form, setForm] = useState(initialForm);
  const [source, setSource] = useState('');
  const [passwordConfigured, setPasswordConfigured] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const settings = await getOtpMailSettings(axiosPrivate);
      setForm({
        host: settings.host || '',
        port: settings.port || 587,
        username: settings.username || '',
        password: '',
        smtpAuth: settings.smtpAuth !== false,
        securityMode: settings.securityMode || 'STARTTLS',
        fromAddress: settings.fromAddress || '',
      });
      setSource(settings.source || '');
      setPasswordConfigured(Boolean(settings.passwordConfigured));
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Chargement de la configuration SMTP impossible.');
    } finally {
      setLoading(false);
    }
  }, [axiosPrivate]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSecurityModeChange = (event) => {
    const securityMode = event.target.value;
    const option = securityOptions.find((item) => item.value === securityMode);
    setForm((current) => ({
      ...current,
      securityMode,
      port: option ? option.port : current.port,
    }));
  };

  const buildPayload = () => ({
    host: form.host.trim(),
    port: Number(form.port),
    username: form.smtpAuth ? form.username.trim() : '',
    password: form.smtpAuth && form.password.trim() ? form.password : null,
    smtpAuth: form.smtpAuth,
    securityMode: form.securityMode,
    fromAddress: form.fromAddress.trim() || null,
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...buildPayload(),
        password: form.smtpAuth && form.password.trim() ? form.password : null,
      };
      const updated = await updateOtpMailSettings(axiosPrivate, payload);
      setForm((current) => ({ ...current, password: '' }));
      setSource(updated.source || 'DATABASE');
      setPasswordConfigured(Boolean(updated.passwordConfigured));
      toast.success('Configuration SMTP mise a jour.');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Mise a jour SMTP impossible.');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async (event) => {
    event.preventDefault();
    if (!testEmail.trim()) {
      toast.error('Adresse email de test obligatoire.');
      return;
    }

    setTesting(true);
    setTestResult(null);
    try {
      await sendOtpMailTest(axiosPrivate, {
        ...buildPayload(),
        targetEmail: testEmail.trim(),
      });
      setTestResult({ type: 'success', message: 'Connexion SMTP valide. Email de test envoye.' });
      toast.success('Connexion SMTP valide.');
    } catch (err) {
      const message = err?.response?.data?.message || 'Email de test impossible.';
      setTestResult({ type: 'error', message });
      toast.error(message);
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Parametres SMTP universels</h1>
          <p className="text-sm text-gray-500 mt-1">Configuration active pour l'envoi des codes OTP par email.</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 shadow-sm">
          <CheckCircleIcon className="w-5 h-5 text-emerald-600" />
          <span>{source === 'DATABASE' ? 'Base de donnees' : 'Fallback env'}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 flex items-center gap-3">
          <ServerIcon className="w-6 h-6 text-ministere-600" />
          <h2 className="text-lg font-bold text-gray-800">Serveur SMTP</h2>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
          <Input
            id="host"
            label="Serveur SMTP"
            value={form.host}
            onChange={(e) => updateField('host', e.target.value)}
            placeholder="smtp.gmail.com"
            icon={ServerIcon}
            required
          />
          <Input
            id="port"
            label="Port"
            type="number"
            min="1"
            value={form.port}
            onChange={(e) => updateField('port', e.target.value)}
            required
          />
          <div className="flex flex-col gap-1">
            <label htmlFor="securityMode" className="text-sm font-medium text-gray-700">
              Type de securite <span className="text-red-500 ml-1">*</span>
            </label>
            <div className="relative flex items-center">
              <div className="absolute left-3 text-gray-400">
                <ShieldCheckIcon className="w-5 h-5" />
              </div>
              <select
                id="securityMode"
                value={form.securityMode}
                onChange={handleSecurityModeChange}
                className="w-full pl-10 px-4 py-3 border border-gray-200 bg-gray-50 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-ministere-500 appearance-none"
                required
              >
                {securityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 md:self-end">
            <input
              type="checkbox"
              checked={form.smtpAuth}
              onChange={(e) => updateField('smtpAuth', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-ministere-600 focus:ring-ministere-500"
            />
            <KeyIcon className="w-5 h-5 text-gray-400" />
            Authentification SMTP
          </label>

          <Input
            id="username"
            label="Nom d'utilisateur"
            value={form.username}
            onChange={(e) => updateField('username', e.target.value)}
            placeholder="Identifiant ou e-mail"
            icon={EnvelopeIcon}
            disabled={!form.smtpAuth}
          />
          <Input
            id="fromAddress"
            label="Adresse expediteur"
            type="email"
            value={form.fromAddress}
            onChange={(e) => updateField('fromAddress', e.target.value)}
            placeholder="otp@domaine.tn"
            icon={EnvelopeIcon}
          />
          <Input
            id="password"
            label={passwordConfigured ? 'Nouveau mot de passe' : 'Mot de passe'}
            type="password"
            value={form.password}
            onChange={(e) => updateField('password', e.target.value)}
            placeholder={passwordConfigured ? 'Laisser vide pour conserver' : 'Mot de passe SMTP'}
            disabled={!form.smtpAuth}
            required={!passwordConfigured && form.smtpAuth}
          />
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
          <Button type="submit" loading={saving}>
            Enregistrer
          </Button>
        </div>
      </form>

      <form onSubmit={handleTest} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 flex items-center gap-3">
          <PaperAirplaneIcon className="w-6 h-6 text-ministere-600" />
          <h2 className="text-lg font-bold text-gray-800">Tester la connexion</h2>
        </div>
        <div className="p-6 flex flex-col md:flex-row gap-4 md:items-end">
          <Input
            id="testEmail"
            label="Destinataire"
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="admin@domaine.tn"
            icon={EnvelopeIcon}
            className="flex-1"
            required
          />
          <Button type="submit" variant="secondary" loading={testing} className="md:mb-0.5">
            Tester la connexion
          </Button>
        </div>
        {testResult && (
          <div className={`mx-6 mb-6 rounded-lg border px-4 py-3 text-sm ${
            testResult.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
          >
            {testResult.message}
          </div>
        )}
      </form>
    </div>
  );
};

export default OtpSettingsPage;
