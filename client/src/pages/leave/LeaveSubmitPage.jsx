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
    <div className="max-w-4xl mx-auto pb-10 space-y-8">

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-0 overflow-hidden border border-gray-200">
          <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-200 flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-blue-100 text-blue-700 flex items-center justify-center font-bold font-mono">1</div>
            <h3 className="text-lg font-bold text-gray-800">Leave Details</h3>
          </div>
          <div className="p-6 md:p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="dateDebut" className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date *
                </label>
                <input
                  id="dateDebut"
                  name="dateDebut"
                  type="date"
                  value={form.dateDebut}
                  onChange={handleChange}
                  className={`w-full px-3 py-2.5 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ministere-500 focus:border-ministere-500 ${
                    formErrors.dateDebut ? 'border-red-400' : 'border-gray-300'
                  }`}
                />
                {formErrors.dateDebut && (
                  <p className="mt-1 text-xs text-red-500">{formErrors.dateDebut}</p>
                )}
              </div>

              <div>
                <label htmlFor="dateFin" className="block text-sm font-medium text-gray-700 mb-1">
                  End Date *
                </label>
                <input
                  id="dateFin"
                  name="dateFin"
                  type="date"
                  value={form.dateFin}
                  onChange={handleChange}
                  className={`w-full px-3 py-2.5 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ministere-500 focus:border-ministere-500 ${
                    formErrors.dateFin ? 'border-red-400' : 'border-gray-300'
                  }`}
                />
                {formErrors.dateFin && <p className="mt-1 text-xs text-red-500">{formErrors.dateFin}</p>}
              </div>
            </div>

            <div className="mt-6">
              <label htmlFor="codeM" className="block text-sm font-medium text-gray-700 mb-1">
                Leave Type / Reason *
              </label>
              <select
                id="codeM"
                name="codeM"
                value={form.codeM}
                onChange={handleChange}
                className={`w-full px-3 py-2.5 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ministere-500 focus:border-ministere-500 ${
                  formErrors.codeM ? 'border-red-400' : 'border-gray-300'
                }`}
              >
                <option value="">Select a reason</option>
                {motifs.map((motif) => (
                  <option key={motif.codeM} value={motif.codeM}>
                    {motif.codeM} - {motif.libMot || 'No description'}
                  </option>
                ))}
              </select>
              {formErrors.codeM && <p className="mt-1 text-xs text-red-500">{formErrors.codeM}</p>}
              {selectedMotif && (
                <p className="mt-2 text-xs text-gray-500">
                  Leave category: <span className="font-semibold text-gray-700">{selectedMotif.typCng || 'N/A'}</span>
                </p>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-0 overflow-hidden border border-gray-200">
          <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-200 flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-blue-100 text-blue-700 flex items-center justify-center font-bold font-mono">2</div>
            <h3 className="text-lg font-bold text-gray-800">Additional Information</h3>
          </div>
          <div className="p-6 md:p-8">
            <div>
              <label htmlFor="motifCng" className="block text-sm font-medium text-gray-700 mb-1">
                Comments (Optional)
              </label>
              <textarea
                id="motifCng"
                name="motifCng"
                rows={4}
                value={form.motifCng}
                onChange={handleChange}
                maxLength={1000}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ministere-500 focus:border-ministere-500"
                placeholder="Add any necessary context for your manager"
              />
            </div>
          </div>
        </Card>

        <div className="flex justify-end pt-4 pb-12 gap-3">
          <Button type="button" variant="outline" className="px-6 border-gray-300 hover:bg-gray-50 text-gray-700" onClick={() => window.history.back()}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting} className="px-8 shadow-md bg-accent-red hover:bg-red-700 border-none text-white">
            Envoyer la demande
          </Button>
        </div>
      </form>
    </div>
  );
};

export default LeaveSubmitPage;
