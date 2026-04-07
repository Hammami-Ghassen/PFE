import React, { useState } from 'react';
import toast from 'react-hot-toast';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { submitEmployeeMock } from '../../services/addEmployeeMockService';

const AddEmployeePage = () => {
  const [form, setForm] = useState({
    matPers: '',
    codUser: 'AGENT',
    codSoc: '',
    email: '',
    phone: '',
    nom: '',
    prenom: '',
    cin: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    // Mock submission is intentionally isolated in a service to keep this component UI-focused.
    await submitEmployeeMock(form);
    setSubmitting(false);
    setSuccess(true);
    toast.success('Soumission simulee (aucun endpoint backend appele).');
  };

  return (
    <div className="max-w-3xl space-y-5">
      <Card>
        <h2 className="text-lg font-semibold text-gray-800 mb-5">Ajouter un employe (UI uniquement)</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            id="matPers"
            name="matPers"
            label="MAT_PERS"
            maxLength={8}
            value={form.matPers}
            onChange={(e) => setForm((prev) => ({ ...prev, matPers: e.target.value.replace(/\D/g, '') }))}
            required
          />
          <Input id="codSoc" name="codSoc" label="COD_SOC" value={form.codSoc} onChange={handleChange} required />
          <div className="flex flex-col gap-1">
            <label htmlFor="codUser" className="text-sm font-medium text-gray-700">COD_USER</label>
            <select
              id="codUser"
              name="codUser"
              value={form.codUser}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ministere-500"
            >
              <option value="AGENT">AGENT</option>
              <option value="DIRECTEUR">DIRECTEUR</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </div>
          <Input id="nom" name="nom" label="Nom" value={form.nom} onChange={handleChange} />
          <Input id="prenom" name="prenom" label="Prenom" value={form.prenom} onChange={handleChange} />
          <Input id="cin" name="cin" label="CIN" value={form.cin} onChange={handleChange} />
          <Input id="email" name="email" label="ADR_ELECTRONIQUE" type="email" value={form.email} onChange={handleChange} />
          <Input id="phone" name="phone" label="TEL_PERT_PERS" value={form.phone} onChange={handleChange} />
          <div className="md:col-span-2">
            <Button type="submit" loading={submitting}>Soumettre (mock)</Button>
          </div>
        </form>
      </Card>

      <Modal
        isOpen={success}
        onClose={() => setSuccess(false)}
        title="Soumission simulee"
        footer={<Button onClick={() => setSuccess(false)}>Fermer</Button>}
      >
        <p className="text-sm text-gray-700">Le formulaire est pret cote UI. L'insertion backend reste desactivee selon votre contrainte.</p>
      </Modal>
    </div>
  );
};

export default AddEmployeePage;
