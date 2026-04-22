import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import { createLeaveRequest, getLeaveMotifs } from '../../services/leaveService';

const LeaveSubmitPage = () => {
  const axiosPrivate = useAxiosPrivate();

  const [motifs, setMotifs] = useState([]);
  const [loadingMotifs, setLoadingMotifs] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [form, setForm] = useState({
    dateDebut: '',
    dateFin: '',
    codeM: '',
    motifCng: '',
  });

  useEffect(() => {
    const loadMotifs = async () => {
      setLoadingMotifs(true);
      try {
        const data = await getLeaveMotifs(axiosPrivate);
        setMotifs(Array.isArray(data) ? data : []);
      } catch {
        toast.error('Erreur lors du chargement des motifs de conge.');
      } finally {
        setLoadingMotifs(false);
      }
    };

    loadMotifs();
  }, [axiosPrivate]);

  const selectedMotif = useMemo(
    () => motifs.find((motif) => motif.codeM === form.codeM) || null,
    [motifs, form.codeM]
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setFormErrors((current) => ({ ...current, [name]: null }));
  };

  const validateForm = () => {
    const errors = {};

    if (!form.dateDebut) {
      errors.dateDebut = 'La date de debut est obligatoire.';
    }
    if (!form.dateFin) {
      errors.dateFin = 'La date de fin est obligatoire.';
    }
    if (form.dateDebut && form.dateFin && form.dateDebut > form.dateFin) {
      errors.dateFin = 'La date de fin doit etre >= date de debut.';
    }
    if (!form.codeM) {
      errors.codeM = 'Le motif est obligatoire.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetForm = () => {
    setForm({ dateDebut: '', dateFin: '', codeM: '', motifCng: '' });
    setFormErrors({});
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const response = await createLeaveRequest(axiosPrivate, form);
      toast.success(
        `Demande envoyee (N° ${response.numDcng || 'n/a'}) - statut ${
          response.statusLabel || 'En attente'
        }.`
      );
      resetForm();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Creation de demande impossible.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingMotifs) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <Card>
        <div className="mb-5">
          <h2 className="text-xl font-semibold text-gray-800">Nouvelle demande de conge</h2>
          <p className="mt-1 text-sm text-gray-500">
            Selectionnez vos dates et un motif officiel pour soumettre votre demande.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="dateDebut" className="block text-sm font-medium text-gray-700 mb-1">
                Date debut
              </label>
              <input
                id="dateDebut"
                name="dateDebut"
                type="date"
                value={form.dateDebut}
                onChange={handleChange}
                className={`w-full px-3 py-2.5 border rounded-lg text-sm bg-white ${
                  formErrors.dateDebut ? 'border-red-400' : 'border-gray-300'
                }`}
              />
              {formErrors.dateDebut && (
                <p className="mt-1 text-xs text-red-500">{formErrors.dateDebut}</p>
              )}
            </div>

            <div>
              <label htmlFor="dateFin" className="block text-sm font-medium text-gray-700 mb-1">
                Date fin
              </label>
              <input
                id="dateFin"
                name="dateFin"
                type="date"
                value={form.dateFin}
                onChange={handleChange}
                className={`w-full px-3 py-2.5 border rounded-lg text-sm bg-white ${
                  formErrors.dateFin ? 'border-red-400' : 'border-gray-300'
                }`}
              />
              {formErrors.dateFin && <p className="mt-1 text-xs text-red-500">{formErrors.dateFin}</p>}
            </div>
          </div>

          <div>
            <label htmlFor="codeM" className="block text-sm font-medium text-gray-700 mb-1">
              Motif
            </label>
            <select
              id="codeM"
              name="codeM"
              value={form.codeM}
              onChange={handleChange}
              className={`w-full px-3 py-2.5 border rounded-lg text-sm bg-white ${
                formErrors.codeM ? 'border-red-400' : 'border-gray-300'
              }`}
            >
              <option value="">Selectionner un motif</option>
              {motifs.map((motif) => (
                <option key={motif.codeM} value={motif.codeM}>
                  {motif.codeM} - {motif.libMot || 'Sans libelle'}
                </option>
              ))}
            </select>
            {formErrors.codeM && <p className="mt-1 text-xs text-red-500">{formErrors.codeM}</p>}
            {selectedMotif && (
              <p className="mt-2 text-xs text-gray-500">
                Type de conge: {selectedMotif.typCng || 'N/A'}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="motifCng" className="block text-sm font-medium text-gray-700 mb-1">
              Commentaire (optionnel)
            </label>
            <textarea
              id="motifCng"
              name="motifCng"
              rows={4}
              value={form.motifCng}
              onChange={handleChange}
              maxLength={1000}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white"
              placeholder="Ajoutez un commentaire si necessaire"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button type="submit" loading={submitting}>
              Envoyer la demande
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={resetForm}
              disabled={submitting}
            >
              Reinitialiser
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default LeaveSubmitPage;
