import React, { useState } from 'react';
import toast from 'react-hot-toast';
import useAuth from '../../hooks/useAuth';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Alert from '../../components/ui/Alert';
import { requestCorrection } from '../../services/correctionService';
import { 
  IdentificationIcon, 
  EnvelopeIcon, 
  ShieldCheckIcon,
  PhoneIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  BriefcaseIcon,
  AcademicCapIcon,
  ComputerDesktopIcon,
  PencilSquareIcon
} from '@heroicons/react/24/outline';

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
  const displayName = auth.user?.fullName || [auth.user?.firstName, auth.user?.lastName].filter(Boolean).join(' ').trim() || auth.user?.matPers;

  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [correctionForm, setCorrectionForm] = useState({
    attributCible: '',
    nouvelleValeur: '',
    pieceJointe: null,
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submittingCorrection, setSubmittingCorrection] = useState(false);
  
  // Get initials for the avatar
  const getInitials = () => {
    if (auth.user?.firstName && auth.user?.lastName) {
      return `${auth.user.firstName[0]}${auth.user.lastName[0]}`.toUpperCase();
    }
    if (displayName !== auth.user?.matPers) {
      return displayName.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

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
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Profile Header */}
      <Card className="bg-gradient-to-r from-ministere-50 to-white border-l-4 border-l-ministere-600">
        <div className="flex items-center gap-6">
          <div className="h-20 w-20 rounded-full bg-ministere-600 text-white flex items-center justify-center text-2xl font-bold shadow-md">
            {getInitials()}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">{displayName}</h2>
            <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
              <ShieldCheckIcon className="w-4 h-4" />
              Système OTP Ministère de la Santé
            </p>
            <div className="mt-4">
              <Button size="sm" onClick={openCorrectionModal}>
                <PencilSquareIcon className="w-4 h-4 mr-1" />
                Demander une correction
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="text-xl font-semibold text-gray-800 mb-6 border-b pb-2 flex items-center gap-2">
          <IdentificationIcon className="w-6 h-6 text-ministere-600" />
          Détails du profil
        </h3>
        
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-5">
          {/* Left Column (Account Info) */}
          <div className="flex flex-col sm:flex-row sm:items-start md:col-start-1 md:row-start-1">
            <dt className="text-base font-medium text-gray-500 w-[40%] flex items-start gap-2 pt-0.5">
              <IdentificationIcon className="w-5 h-5 flex-shrink-0" /> MAT_PERS
            </dt>
            <dd className="text-base text-gray-900 font-medium sm:w-[60%]">{auth.user?.matPers || '—'}</dd>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-start md:col-start-1 md:row-start-2">
            <dt className="text-base font-medium text-gray-500 w-[40%] flex items-start gap-2 pt-0.5">
              <EnvelopeIcon className="w-5 h-5 flex-shrink-0" /> Email
            </dt>
            <dd className="text-base text-gray-900 sm:w-[60%] break-all">{auth.user?.email || '—'}</dd>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-start md:col-start-1 md:row-start-3">
            <dt className="text-base font-medium text-gray-500 w-[40%] flex items-start gap-2 pt-0.5">
              <PhoneIcon className="w-5 h-5 flex-shrink-0" /> Téléphone
            </dt>
            <dd className="text-base text-gray-900 sm:w-[60%]">{auth.user?.phone || '—'}</dd>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-start md:col-start-1 md:row-start-4">
            <dt className="text-base font-medium text-gray-500 w-[40%] flex items-start gap-2 pt-0.5">
              <BuildingOfficeIcon className="w-5 h-5 flex-shrink-0" /> Etablissement
            </dt>
            <dd className="text-base text-gray-900 sm:w-[60%]">{auth.user?.establishmentName || '—'}</dd>
          </div>

          {/* Right Column (Professional Info) */}
          <div className="flex flex-col sm:flex-row sm:items-start md:col-start-2 md:row-start-1">
            <dt className="text-base font-medium text-gray-500 w-[40%] flex items-start gap-2 pt-0.5">
              <MapPinIcon className="w-5 h-5 flex-shrink-0" /> Adresse
            </dt>
            <dd className="text-base text-gray-900 sm:w-[60%]">{auth.user?.adresse || '—'}</dd>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-start md:col-start-2 md:row-start-2">
            <dt className="text-base font-medium text-gray-500 w-[40%] flex items-start gap-2 pt-0.5">
              <BriefcaseIcon className="w-5 h-5 flex-shrink-0" /> Service
            </dt>
            <dd className="text-base text-gray-900 sm:w-[60%]">{auth.user?.service || '—'}</dd>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-start md:col-start-2 md:row-start-3">
            <dt className="text-base font-medium text-gray-500 w-[40%] flex items-start gap-2 pt-0.5">
              <AcademicCapIcon className="w-5 h-5 flex-shrink-0" /> Grade
            </dt>
            <dd className="text-base text-gray-900 sm:w-[60%]">{auth.user?.grade || '—'}</dd>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-start md:col-start-2 md:row-start-4">
            <dt className="text-base font-medium text-gray-500 w-[40%] flex items-start gap-2 pt-0.5">
              <ComputerDesktopIcon className="w-5 h-5 flex-shrink-0" /> Poste
            </dt>
            <dd className="text-base text-gray-900 sm:w-[60%]">{auth.user?.posteTravail || '—'}</dd>
          </div>
        </dl>
      </Card>

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
              className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ministere-500 focus:border-transparent ${
                formErrors.attributCible ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'
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
              className={`w-full px-3 py-2.5 border rounded-lg text-sm file:mr-3 file:px-3 file:py-1.5 file:rounded-md file:border-0 file:bg-ministere-50 file:text-ministere-700 hover:file:bg-ministere-100 ${
                formErrors.pieceJointe ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'
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
