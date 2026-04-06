import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import { getUserById, updateUser } from '../../services/userService';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';
import { ROLES } from '../../utils/constants';

const EditUserPage = () => {
  const { id } = useParams();
  const axiosPrivate = useAxiosPrivate();
  const navigate = useNavigate();

  const [form, setForm] = useState({ nom: '', prenom: '', email: '', role: ROLES.USER });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    getUserById(axiosPrivate, id)
      .then((user) => {
        setForm({
          nom: user.nom,
          prenom: user.prenom,
          email: user.email || '',
          role: user.role,
        });
      })
      .catch(() => {
        toast.error('Utilisateur introuvable.');
        navigate('/admin/users');
      })
      .finally(() => setFetching(false));
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const newErrors = {};
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
      await updateUser(axiosPrivate, id, form);
      toast.success('Utilisateur modifié avec succès.');
      navigate('/admin/users');
    } catch (err) {
      const msg = err?.response?.data?.message || 'Erreur lors de la modification.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-xl">
      <Card>
        <h2 className="text-lg font-semibold text-gray-800 mb-6">Modifier l'Utilisateur</h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Input
              id="nom"
              name="nom"
              label="Nom"
              value={form.nom}
              onChange={handleChange}
              error={errors.nom}
              required
            />
            <Input
              id="prenom"
              name="prenom"
              label="Prénom"
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
              Enregistrer
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default EditUserPage;
