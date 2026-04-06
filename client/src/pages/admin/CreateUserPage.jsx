import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import { createUser } from '../../services/userService';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Modal from '../../components/ui/Modal';
import { ROLES } from '../../utils/constants';
import { ClipboardDocumentIcon } from '@heroicons/react/24/outline';

const CreateUserPage = () => {
  const axiosPrivate = useAxiosPrivate();
  const navigate = useNavigate();

  const [form, setForm] = useState({ cin: '', nom: '', prenom: '', email: '', role: ROLES.USER });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Success modal
  const [successModal, setSuccessModal] = useState({ open: false, password: null });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const newErrors = {};
    if (!/^\d{8}$/.test(form.cin)) newErrors.cin = 'Le CIN doit contenir exactement 8 chiffres.';
    if (!form.nom.trim()) newErrors.nom = 'Le nom est obligatoire.';
    if (!form.prenom.trim()) newErrors.prenom = 'Le prénom est obligatoire.';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      newErrors.email = 'Email invalide.';
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    try {
      const result = await createUser(axiosPrivate, form);
      setSuccessModal({ open: true, password: result.generatedPassword });
    } catch (err) {
      const msg = err?.response?.data?.message || 'Erreur lors de la création.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSuccessModal({ open: false, password: null });
    navigate('/admin/users');
  };

  const handleCreateAnother = () => {
    setSuccessModal({ open: false, password: null });
    setForm({ cin: '', nom: '', prenom: '', email: '', role: ROLES.USER });
  };

  const copyPassword = () => {
    navigator.clipboard.writeText(successModal.password);
    toast.success('Mot de passe copié !');
  };

  return (
    <div className="max-w-xl">
      <Card>
        <h2 className="text-lg font-semibold text-gray-800 mb-6">Nouvel Utilisateur</h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            id="cin"
            name="cin"
            label="N° CIN"
            placeholder="Ex: 12345678"
            maxLength={8}
            value={form.cin}
            onChange={handleChange}
            error={errors.cin}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              id="nom"
              name="nom"
              label="Nom"
              placeholder="Ben Ali"
              value={form.nom}
              onChange={handleChange}
              error={errors.nom}
              required
            />
            <Input
              id="prenom"
              name="prenom"
              label="Prénom"
              placeholder="Mohamed"
              value={form.prenom}
              onChange={handleChange}
              error={errors.prenom}
              required
            />
          </div>

          <Input
            id="email"
            name="email"
            label="Email"
            type="email"
            placeholder="m.benali@sante.tn"
            value={form.email}
            onChange={handleChange}
            error={errors.email}
          />

          <div className="flex flex-col gap-1">
            <label htmlFor="role" className="text-sm font-medium text-gray-700">
              Rôle <span className="text-red-500">*</span>
            </label>
            <select
              id="role"
              name="role"
              value={form.role}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ministere-500 focus:border-transparent bg-white"
            >
              <option value={ROLES.USER}>Utilisateur</option>
              <option value={ROLES.ADMIN}>Administrateur</option>
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/admin/users')}
            >
              Annuler
            </Button>
            <Button type="submit" loading={loading}>
              Créer l'utilisateur
            </Button>
          </div>
        </form>
      </Card>

      {/* Success modal */}
      <Modal
        isOpen={successModal.open}
        onClose={handleClose}
        title="✅ Utilisateur créé avec succès"
        footer={
          <>
            <Button variant="secondary" onClick={handleCreateAnother}>
              Créer un autre
            </Button>
            <Button onClick={copyPassword}>
              <ClipboardDocumentIcon className="w-4 h-4 mr-1.5" />
              Copier
            </Button>
            <Button variant="primary" onClick={handleClose}>
              Fermer
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-amber-600 text-sm font-medium">
            ⚠️ Notez le mot de passe généré ci-dessous. Il ne sera plus affiché après fermeture.
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
            <code className="font-mono text-lg text-gray-800 tracking-widest">
              {successModal.password}
            </code>
          </div>
          <p className="text-xs text-gray-400">
            Ce mot de passe ne sera plus affiché après fermeture de cette fenêtre.
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default CreateUserPage;
