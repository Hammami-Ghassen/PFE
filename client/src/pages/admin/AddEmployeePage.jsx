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
    toast.success('Soumission simulée (aucun endpoint backend appelé).');
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-10">
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-0 overflow-hidden border border-gray-200">
          <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-200 flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-blue-100 text-blue-700 flex items-center justify-center font-bold font-mono">1</div>
            <h3 className="text-lg font-bold text-gray-800">Informations Personnelles</h3>
          </div>
          <div className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row gap-8">
              <div className="w-full md:w-32 flex flex-col items-center justify-center space-y-2 shrink-0">
                <div className="h-32 w-32 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-400 bg-gray-50/50 hover:bg-gray-50 cursor-pointer transition-colors">
                  <svg className="w-8 h-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-xs font-semibold text-center">Télécharger la photo</span>
                </div>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">JPG, PNG max 2Mo</span>
              </div>
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input id="prenom" name="prenom" label="Prénom *" value={form.prenom} onChange={handleChange} placeholder="Entrez le prénom" required />
                <Input id="nom" name="nom" label="Nom *" value={form.nom} onChange={handleChange} placeholder="Entrez le nom" required />
                <Input id="cin" name="cin" label="CIN *" value={form.cin} onChange={handleChange} placeholder="Numéro à 8 chiffres" required />
                <Input id="dateOfBirth" name="dateOfBirth" label="Date de Naissance *" type="date" placeholder="jj/mm/aaaa" required />
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-0 overflow-hidden border border-gray-200">
          <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-200 flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-blue-100 text-blue-700 flex items-center justify-center font-bold font-mono">2</div>
            <h3 className="text-lg font-bold text-gray-800">Informations Professionnelles</h3>
          </div>
          <div className="p-6 md:p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input id="department" name="department" label="Département *" placeholder="Sélectionnez le département" required />
              <Input id="role" name="role" label="Rôle / Fonction *" placeholder="ex. Infirmier" required />
              <Input id="grade" name="grade" label="Grade Professionnel *" placeholder="Sélectionnez le grade" required />
              <Input id="contractType" name="contractType" label="Type de Contrat *" placeholder="Sélectionnez le type de contrat" required />
            </div>
          </div>
        </Card>

        <Card className="p-0 overflow-hidden border border-gray-200">
          <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-200 flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-blue-100 text-blue-700 flex items-center justify-center font-bold font-mono">3</div>
            <h3 className="text-lg font-bold text-gray-800">Identifiants de Connexion</h3>
          </div>
          <div className="p-6 md:p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                id="matPers"
                name="matPers"
                label="MAT_PERS *"
                maxLength={8}
                value={form.matPers}
                onChange={(e) => setForm((prev) => ({ ...prev, matPers: e.target.value.replace(/\D/g, '') }))}
                required
              />
              <div className="flex flex-col gap-1">
                <label htmlFor="codUser" className="text-sm font-medium text-gray-700">Type de Compte *</label>
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
              <Input id="email" name="email" label="Adresse Email *" type="email" value={form.email} onChange={handleChange} required />
              <Input id="phone" name="phone" label="Numéro de Téléphone *" value={form.phone} onChange={handleChange} required />
            </div>
          </div>
        </Card>

        <div className="flex justify-end pt-4 pb-12 gap-3">
          <Button type="button" variant="outline" className="px-6 border-gray-300 hover:bg-gray-50 text-gray-700" onClick={() => window.history.back()}>
            Annuler
          </Button>
          <Button type="submit" loading={submitting} className="px-8 shadow-md bg-accent-red hover:bg-red-700 border-none text-white">
            Enregistrer & Continuer →
          </Button>
        </div>
      </form>

      <Modal
        isOpen={success}
        onClose={() => setSuccess(false)}
        title="Soumission Simulée"
        footer={<Button onClick={() => setSuccess(false)}>Fermer</Button>}
      >
        <p className="text-sm text-gray-700">La mise en page du formulaire est terminée. L'insertion reste simulée (mock).</p>
      </Modal>
    </div>
  );
};

export default AddEmployeePage;
