import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuth from '../../hooks/useAuth';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Alert from '../../components/ui/Alert';
import { requestCorrection } from '../../services/correctionService';
import { getCurrentLeaveBalance } from '../../services/leaveService';
import ProfileHeader from '../../components/ui/ProfileHeader';
import LeaveBalanceCard from '../../components/ui/LeaveBalanceCard';
import { 
  ClockIcon, 
  IdentificationIcon, 
  BuildingOfficeIcon, 
  EnvelopeIcon, 
  PhoneIcon, 
  MapPinIcon, 
  BriefcaseIcon, 
  AcademicCapIcon 
} from '@heroicons/react/24/outline';

const formatBalanceValue = (value) => {
  if (value === null || value === undefined) return '0';
  const parsed = Number.parseFloat(value);
  if (Number.isNaN(parsed)) return '0';
  return String(Number.isInteger(parsed) ? parsed : parsed.toFixed(3));
};

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;

const correctionAttributes = [
  { value: 'NOM', label: 'Nom' },
  { value: 'PRENOM', label: 'Prénom' },
  { value: 'ADRESSE', label: 'Adresse' },
  { value: 'TELEPHONE', label: 'Téléphone' },
  { value: 'EMAIL', label: 'Email' },
];

const DashboardPage = () => {
  const { auth } = useAuth();
  const axiosPrivate = useAxiosPrivate();
  const navigate = useNavigate();

  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [correctionForm, setCorrectionForm] = useState({
    attributCible: '',
    nouvelleValeur: '',
    pieceJointe: null,
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submittingCorrection, setSubmittingCorrection] = useState(false);

  const [balance, setBalance] = useState(null);
  const [loadingBalance, setLoadingBalance] = useState(true);

  const loadBalance = useCallback(async () => {
    setLoadingBalance(true);
    try {
      const response = await getCurrentLeaveBalance(axiosPrivate);
      setBalance(response);
    } catch {
      toast.error('Erreur lors du chargement de votre solde de conge.');
    } finally {
      setLoadingBalance(false);
    }
  }, [axiosPrivate]);

  useEffect(() => {
    loadBalance();
  }, [loadBalance]);

  const resetCorrectionForm = () => {
    setCorrectionForm({ attributCible: '', nouvelleValeur: '', pieceJointe: null });
    setFormErrors({});
    setSubmitError('');
  };

  const openCorrectionModal = () => {
    resetCorrectionForm();
    setIsCorrectionModalOpen(true);
  };

  const closeCorrectionModal = () => {
    if (submittingCorrection) {
      return;
    }
    setIsCorrectionModalOpen(false);
  };

  const validateCorrectionForm = () => {
    const errors = {};

    if (!correctionForm.attributCible) {
      errors.attributCible = 'Sélectionnez un attribut à corriger.';
    }

    if (!correctionForm.nouvelleValeur || !correctionForm.nouvelleValeur.trim()) {
      errors.nouvelleValeur = 'La nouvelle valeur est obligatoire.';
    }

    if (!correctionForm.pieceJointe) {
      errors.pieceJointe = 'La pièce jointe est obligatoire.';
    } else if (correctionForm.pieceJointe.size > MAX_FILE_SIZE_BYTES) {
      errors.pieceJointe = 'La pièce jointe ne doit pas dépasser 2 Mo.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCorrectionFieldChange = (event) => {
    const { name, value } = event.target;
    setCorrectionForm((prev) => ({ ...prev, [name]: value }));
    setFormErrors((prev) => ({ ...prev, [name]: null }));
    setSubmitError('');
  };

  const handleAttachmentChange = (event) => {
    const selectedFile = event.target.files?.[0] || null;

    setCorrectionForm((prev) => ({ ...prev, pieceJointe: selectedFile }));
    setSubmitError('');

    if (!selectedFile) {
      setFormErrors((prev) => ({ ...prev, pieceJointe: 'La pièce jointe est obligatoire.' }));
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      setFormErrors((prev) => ({ ...prev, pieceJointe: 'La pièce jointe ne doit pas dépasser 2 Mo.' }));
      return;
    }

    setFormErrors((prev) => ({ ...prev, pieceJointe: null }));
  };

  const handleSubmitCorrection = async (event) => {
    event.preventDefault();
    if (!validateCorrectionForm()) {
      return;
    }

    setSubmittingCorrection(true);
    setSubmitError('');

    try {
      await requestCorrection(axiosPrivate, {
        attributCible: correctionForm.attributCible,
        nouvelleValeur: correctionForm.nouvelleValeur.trim(),
        pieceJointe: correctionForm.pieceJointe,
      });
      toast.success('Demande de correction envoyée.');
      setIsCorrectionModalOpen(false);
      resetCorrectionForm();
    } catch (err) {
      const message = err?.response?.data?.message || 'Envoi de la demande impossible.';
      setSubmitError(message);
      toast.error(message);
    } finally {
      setSubmittingCorrection(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Profile Header */}
      <ProfileHeader
        user={auth.user}
        onEditProfile={openCorrectionModal}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <h3 className="text-xl font-semibold text-gray-800 mb-6 border-b pb-2">
              Informations professionnelles
            </h3>

            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start p-4 rounded-xl bg-gray-50/50 border border-gray-100 transition-colors hover:bg-gray-50">
                <div className="flex-shrink-0 p-2 bg-white rounded-lg border border-gray-100 mr-4 shadow-sm">
                  <IdentificationIcon className="w-5 h-5 text-gray-500" />
                </div>
                <div>
                  <dt className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Matricule (MAT_PERS)</dt>
                  <dd className="text-sm text-gray-900 font-semibold">{auth.user?.matPers || '—'}</dd>
                </div>
              </div>
              <div className="flex items-start p-4 rounded-xl bg-gray-50/50 border border-gray-100 transition-colors hover:bg-gray-50">
                <div className="flex-shrink-0 p-2 bg-white rounded-lg border border-gray-100 mr-4 shadow-sm">
                  <BriefcaseIcon className="w-5 h-5 text-gray-500" />
                </div>
                <div>
                  <dt className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Poste de travail</dt>
                  <dd className="text-sm text-gray-900 font-semibold">{auth.user?.posteTravail || '—'}</dd>
                </div>
              </div>
              <div className="flex items-start p-4 rounded-xl bg-gray-50/50 border border-gray-100 transition-colors hover:bg-gray-50">
                <div className="flex-shrink-0 p-2 bg-white rounded-lg border border-gray-100 mr-4 shadow-sm">
                  <AcademicCapIcon className="w-5 h-5 text-gray-500" />
                </div>
                <div>
                  <dt className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Grade</dt>
                  <dd className="text-sm text-gray-900 font-semibold">{auth.user?.grade || '—'}</dd>
                </div>
              </div>
              <div className="flex items-start p-4 rounded-xl bg-gray-50/50 border border-gray-100 transition-colors hover:bg-gray-50">
                <div className="flex-shrink-0 p-2 bg-white rounded-lg border border-gray-100 mr-4 shadow-sm">
                  <BuildingOfficeIcon className="w-5 h-5 text-gray-500" />
                </div>
                <div>
                  <dt className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Établissement & Service</dt>
                  <dd className="text-sm text-gray-900 font-semibold">
                    {auth.user?.establishmentName || '—'}<br />
                    <span className="text-xs text-gray-500 font-normal mt-0.5 inline-block">{auth.user?.service || '—'}</span>
                  </dd>
                </div>
              </div>
              <div className="flex items-start p-4 rounded-xl bg-gray-50/50 border border-gray-100 transition-colors hover:bg-gray-50">
                <div className="flex-shrink-0 p-2 bg-white rounded-lg border border-gray-100 mr-4 shadow-sm">
                  <EnvelopeIcon className="w-5 h-5 text-gray-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <dt className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Email</dt>
                  <dd className="text-sm text-gray-900 font-semibold break-words">{auth.user?.email || '—'}</dd>
                </div>
              </div>
              <div className="flex items-start p-4 rounded-xl bg-gray-50/50 border border-gray-100 transition-colors hover:bg-gray-50">
                <div className="flex-shrink-0 p-2 bg-white rounded-lg border border-gray-100 mr-4 shadow-sm">
                  <PhoneIcon className="w-5 h-5 text-gray-500" />
                </div>
                <div>
                  <dt className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Téléphone</dt>
                  <dd className="text-sm text-gray-900 font-semibold">{auth.user?.phone || '—'}</dd>
                </div>
              </div>
              <div className="flex items-start p-4 rounded-xl bg-gray-50/50 border border-gray-100 transition-colors hover:bg-gray-50 md:col-span-2">
                <div className="flex-shrink-0 p-2 bg-white rounded-lg border border-gray-100 mr-4 shadow-sm">
                  <MapPinIcon className="w-5 h-5 text-gray-500" />
                </div>
                <div>
                  <dt className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Adresse</dt>
                  <dd className="text-sm text-gray-900 font-semibold">{auth.user?.adresse || '—'}</dd>
                </div>
              </div>
            </dl>
          </Card>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <Card className="h-full flex flex-col items-stretch p-0 overflow-hidden">
            <LeaveBalanceCard
              title="SOLDE ACTUEL"
              balance={loadingBalance ? '...' : formatBalanceValue(balance?.currentBalance)}
              subtitle={`Restant pour ${new Date().getFullYear()}`}
              type="annual"
            />
            <div className="p-4 border-t border-gray-100 bg-white">
              <Button
                variant="secondary"
                className="w-full justify-center text-accent-red border-accent-red hover:bg-red-50"
                onClick={() => navigate('/leave/my-requests')}
              >
                <ClockIcon className="w-4 h-4 mr-2" />
                VOIR L'HISTORIQUE DES CONGÉS
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <Modal
        isOpen={isCorrectionModalOpen}
        onClose={closeCorrectionModal}
        title="Demander une correction"
        footer={(
          <>
            <Button
              variant="secondary"
              onClick={closeCorrectionModal}
              disabled={submittingCorrection}
            >
              Annuler
            </Button>
            <Button type="submit" form="correction-request-form" loading={submittingCorrection}>
              Envoyer
            </Button>
          </>
        )}
      >
        <form id="correction-request-form" onSubmit={handleSubmitCorrection} className="space-y-4">
          {submitError && <Alert type="error" message={submitError} />}

          <div className="flex flex-col gap-1">
            <label htmlFor="attributCible" className="text-sm font-medium text-gray-700">
              Attribut à modifier
            </label>
            <select
              id="attributCible"
              name="attributCible"
              value={correctionForm.attributCible}
              onChange={handleCorrectionFieldChange}
              className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ministere-500 focus:border-transparent ${formErrors.attributCible ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'
                }`}
            >
              <option value="">Sélectionner un attribut</option>
              {correctionAttributes.map((attribute) => (
                <option key={attribute.value} value={attribute.value}>
                  {attribute.label}
                </option>
              ))}
            </select>
            {formErrors.attributCible && <p className="text-xs text-red-500">{formErrors.attributCible}</p>}
          </div>

          <Input
            id="nouvelleValeur"
            name="nouvelleValeur"
            label="Nouvelle valeur"
            value={correctionForm.nouvelleValeur}
            onChange={handleCorrectionFieldChange}
            error={formErrors.nouvelleValeur}
            required
          />

          <div className="flex flex-col gap-1">
            <label htmlFor="pieceJointe" className="text-sm font-medium text-gray-700">
              Pièce jointe de vérification
            </label>
            <input
              id="pieceJointe"
              name="pieceJointe"
              type="file"
              onChange={handleAttachmentChange}
              className={`w-full px-3 py-2.5 border rounded-lg text-sm file:mr-3 file:px-3 file:py-1.5 file:rounded-md file:border-0 file:bg-ministere-50 file:text-ministere-700 hover:file:bg-ministere-100 ${formErrors.pieceJointe ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'
                }`}
            />
            <p className="text-xs text-gray-500">Taille maximale autorisée: 2 Mo.</p>
            {formErrors.pieceJointe && <p className="text-xs text-red-500">{formErrors.pieceJointe}</p>}
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default DashboardPage;
