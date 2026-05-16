import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '../../components/ui/Modal';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import StatCard from '../../components/ui/StatCard';
import LeaveBalanceCard from '../../components/ui/LeaveBalanceCard';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import { buildPageWindow } from '../../hooks/usePersonnelPagination';
import { formatDate } from '../../utils/helpers';
import { isLeaveAttachmentRequired } from './leaveRequestRules';
import {
  createLeaveRequest,
  getCurrentLeaveBalance,
  getLeaveEntitlements,
  getLeaveHolidays,
  getLeaveMotifs,
  getMyLeaveRequests,
} from '../../services/leaveService';
import {
  CalendarDaysIcon,
  ClockIcon,
  CheckCircleIcon,
  PlusIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

const PAGE_SIZE = 50;

const statusClassNames = {
  I: 'bg-amber-100 text-amber-800',
  O: 'bg-emerald-100 text-emerald-800',
  N: 'bg-red-100 text-red-700',
};

const normalizeHolidayDayMonth = (value) => {
  if (!value || typeof value !== 'string') return null;
  const normalized = value.trim();
  return /^\d{2}\/\d{2}$/.test(normalized) ? normalized : null;
};

const toDayMonth = (date) => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
};

const calculateBusinessDays = (startDate, endDate, holidaysSet) => {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return 0;

  let days = 0;
  for (let current = new Date(start); current <= end; current.setDate(current.getDate() + 1)) {
    const dayOfWeek = current.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isHoliday = holidaysSet.has(toDayMonth(current));
    if (!isWeekend && !isHoliday) {
      days += 1;
    }
  }

  return days;
};

const calculateCalendarDays = (startDate, endDate) => {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return 0;
  return Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
};

const formatBalanceValue = (value) => {
  if (value === null || value === undefined) return '0';
  const parsed = Number.parseFloat(value);
  if (Number.isNaN(parsed)) return '0';
  return String(Number.isInteger(parsed) ? parsed : parsed.toFixed(3));
};

const MyLeaveRequestsPage = () => {
  const axiosPrivate = useAxiosPrivate();

  const [data, setData] = useState({
    content: [],
    totalPages: 0,
    totalElements: 0,
  });
  const [page, setPage] = useState(0);
  const [loadingRequests, setLoadingRequests] = useState(true);

  const [balance, setBalance] = useState(null);
  const [loadingBalance, setLoadingBalance] = useState(true);

  const [motifs, setMotifs] = useState([]);
  const [entitlements, setEntitlements] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [loadingModalData, setLoadingModalData] = useState(false);

  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [openedReasonKey, setOpenedReasonKey] = useState(null);
  const [form, setForm] = useState({
    dateDebut: '',
    dateFin: '',
    codeM: '',
    motifCng: '',
    attachment: null,
  });

  const loadRequests = useCallback(async () => {
    setLoadingRequests(true);
    try {
      const response = await getMyLeaveRequests(axiosPrivate, {
        page,
        size: PAGE_SIZE,
      });
      setData(response);
    } catch {
      toast.error('Erreur lors du chargement de vos demandes de conge.');
    } finally {
      setLoadingRequests(false);
    }
  }, [axiosPrivate, page]);

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

  const loadModalData = useCallback(async () => {
    setLoadingModalData(true);
    try {
      const [motifResult, holidayResult, entitlementResult] = await Promise.allSettled([
        getLeaveMotifs(axiosPrivate),
        getLeaveHolidays(axiosPrivate),
        getLeaveEntitlements(axiosPrivate),
      ]);

      if (motifResult.status === 'fulfilled') {
        setMotifs(Array.isArray(motifResult.value) ? motifResult.value : []);
      } else {
        setMotifs([]);
        toast.error('Erreur lors du chargement des motifs de conge.');
      }

      if (holidayResult.status === 'fulfilled') {
        setHolidays(Array.isArray(holidayResult.value) ? holidayResult.value : []);
      } else {
        setHolidays([]);
      }

      if (entitlementResult.status === 'fulfilled') {
        setEntitlements(Array.isArray(entitlementResult.value) ? entitlementResult.value : []);
      } else {
        setEntitlements([]);
      }
    } catch {
      toast.error('Erreur lors du chargement du formulaire de conge.');
    } finally {
      setLoadingModalData(false);
    }
  }, [axiosPrivate]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    loadBalance();
  }, [loadBalance]);

  useEffect(() => {
    if (isSubmitModalOpen && (motifs.length === 0 || holidays.length === 0 || entitlements.length === 0)) {
      loadModalData();
    }
  }, [entitlements.length, holidays.length, isSubmitModalOpen, loadModalData, motifs.length]);

  const holidayDayMonthSet = useMemo(() => {
    const result = new Set();
    holidays.forEach((holiday) => {
      const normalized = normalizeHolidayDayMonth(holiday?.datFerier);
      if (normalized) {
        result.add(normalized);
      }
    });
    return result;
  }, [holidays]);

  const requestedBusinessDays = useMemo(
    () => calculateBusinessDays(form.dateDebut, form.dateFin, holidayDayMonthSet),
    [form.dateDebut, form.dateFin, holidayDayMonthSet]
  );

  const requestedCalendarDays = useMemo(
    () => calculateCalendarDays(form.dateDebut, form.dateFin),
    [form.dateDebut, form.dateFin]
  );

  const selectedMotif = useMemo(
    () => motifs.find((motif) => motif.codeM === form.codeM) || null,
    [form.codeM, motifs]
  );

  const selectedEntitlement = useMemo(
    () => entitlements.find((entitlement) => entitlement.codeM === form.codeM) || null,
    [entitlements, form.codeM]
  );

  const availableBalance = useMemo(() => {
    const parsed = Number.parseFloat(balance?.currentBalance ?? 0);
    return Number.isNaN(parsed) ? 0 : parsed;
  }, [balance]);

  const isBalanceDeductingMotif = Boolean(selectedMotif?.deductsFromBalance);
  const hasInsufficientBalance = isBalanceDeductingMotif && requestedBusinessDays > availableBalance;
  const usesCalendarLimit = ['04', '05', '50'].includes(form.codeM);
  const requestedLimitDays = usesCalendarLimit ? requestedCalendarDays : requestedBusinessDays;
  const remainingDays = Number.parseFloat(selectedEntitlement?.remainingDaysYear ?? selectedEntitlement?.remainingDaysCareer ?? NaN);
  const hasRemainingLimit = !Number.isNaN(remainingDays);
  const hasExceededEntitlement = hasRemainingLimit && requestedLimitDays > remainingDays;
  const isAttachmentRequired = isLeaveAttachmentRequired(selectedMotif, form.codeM, requestedBusinessDays);

  const pendingCount = data.content.filter((request) => request.statusCode === 'I').length;
  const approvedCount = data.content.filter((request) => request.statusCode === 'O').length;

  const resetForm = () => {
    setForm({
      dateDebut: '',
      dateFin: '',
      codeM: '',
      motifCng: '',
      attachment: null,
    });
    setFormErrors({});
    setSubmitError('');
  };

  const openSubmitModal = () => {
    resetForm();
    setIsSubmitModalOpen(true);
  };

  const closeSubmitModal = () => {
    if (submitting) return;
    setIsSubmitModalOpen(false);
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setFormErrors((current) => ({ ...current, [name]: null }));
    setSubmitError('');
  };

  const handleAttachmentChange = (event) => {
    const file = event.target.files?.[0] || null;
    setForm((current) => ({ ...current, attachment: file }));
    setFormErrors((current) => ({ ...current, attachment: null }));
    setSubmitError('');
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
    if (requestedBusinessDays <= 0) {
      errors.dateFin = 'La demande doit contenir au moins 1 jour ouvrable.';
    }
    if (hasInsufficientBalance) {
      errors.dateFin = 'La duree demandee depasse votre solde disponible.';
    }
    if (hasExceededEntitlement) {
      errors.dateFin = 'La duree demandee depasse le plafond restant pour ce motif.';
    }
    if (isAttachmentRequired && !form.attachment) {
      errors.attachment = 'La piece jointe est obligatoire pour ce motif.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    setSubmitError('');
    try {
      const response = await createLeaveRequest(axiosPrivate, form);
      toast.success(`Demande envoyee (N° ${response.numDcng || 'n/a'}).`);
      setIsSubmitModalOpen(false);
      resetForm();
      setEntitlements([]);
      await Promise.all([loadRequests(), loadBalance()]);
    } catch (error) {
      const message = error?.response?.data?.message || 'Creation de demande impossible.';
      setSubmitError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Mes demandes de conge</h2>
          <p className="text-sm text-gray-500">Suivez votre historique et deposez une nouvelle demande.</p>
        </div>
        <Button onClick={openSubmitModal} className="gap-2">
          <PlusIcon className="w-4 h-4" />
          Nouvelle Demande
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <LeaveBalanceCard
          title="SOLDE ACTUEL"
          balance={loadingBalance ? '...' : formatBalanceValue(balance?.currentBalance)}
          subtitle="Jours ouvrables disponibles"
          icon={CalendarDaysIcon}
        />
        <StatCard
          title="TOTAL DEMANDES"
          value={data.totalElements || '0'}
          icon={CalendarDaysIcon}
          accentColor="bg-blue-50 text-blue-600"
        />
        <StatCard
          title="EN ATTENTE"
          value={pendingCount || '0'}
          icon={ClockIcon}
          accentColor="bg-amber-50 text-amber-600"
        />
        <StatCard
          title="APPROUVÉES (ANNÉE)"
          value={approvedCount || '0'}
          icon={CheckCircleIcon}
          accentColor="bg-green-50 text-green-600"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-800">Historique des demandes</h3>
        </div>

        {loadingRequests ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80 text-gray-500 text-xs font-bold uppercase tracking-widest border-b border-gray-200">
                  <th className="px-6 py-4 text-left">N° DEMANDE</th>
                  <th className="px-6 py-4 text-left">DATE SOUMISSION</th>
                  <th className="px-6 py-4 text-left">PÉRIODE</th>
                  <th className="px-6 py-4 text-left">MOTIF</th>
                  <th className="px-6 py-4 text-center">DURÉE</th>
                  <th className="px-6 py-4 text-left">REFUS</th>
                  <th className="px-6 py-4 text-right">STATUT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.content.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-gray-400">
                      Aucune demande de conge.
                    </td>
                  </tr>
                ) : (
                  data.content.map((request) => (
                    <tr key={`${request.codSoc}-${request.matPers}-${request.numDcng}`} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-6 py-4 text-gray-600 font-medium">#{request.numDcng}</td>
                      <td className="px-6 py-4 text-gray-500">{formatDate(request.dateDemande)}</td>
                      <td className="px-6 py-4 text-gray-600 text-xs leading-relaxed">
                        <div className="font-semibold text-gray-900 mb-0.5">{formatDate(request.dateDebut)}</div>
                        <div className="text-gray-400">au {formatDate(request.dateFin)}</div>
                      </td>
                      <td className="px-6 py-4 text-gray-700">{request.libMot || request.codeM || '—'}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex px-3 py-1 bg-gray-50 text-gray-600 rounded font-medium border border-gray-200 shadow-sm">
                          {request.nbrJours ?? '—'} jour(s)
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600 text-xs">
                        {request.statusCode === 'N' && request.rejectionComment ? (
                          <div className="space-y-1">
                            <button
                              type="button"
                              onClick={() => setOpenedReasonKey((current) => (current === `${request.codSoc}-${request.matPers}-${request.numDcng}` ? null : `${request.codSoc}-${request.matPers}-${request.numDcng}`))}
                              className="inline-flex items-center gap-1.5 text-red-700 hover:text-red-800 font-medium"
                            >
                              <InformationCircleIcon className="w-4 h-4" />
                              Voir motif
                            </button>
                            {openedReasonKey === `${request.codSoc}-${request.matPers}-${request.numDcng}` && (
                              <p className="text-red-700 leading-relaxed">{request.rejectionComment}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span
                          className={`inline-flex px-3 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wider ${
                            statusClassNames[request.statusCode] || 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {request.statusLabel || request.statusCode}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {data.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 text-sm text-gray-500">
            <span>{data.totalElements} demande(s)</span>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPage((currentPage) => Math.max(0, currentPage - 1))}
                disabled={page === 0}
              >
                ←
              </Button>
              {buildPageWindow(page, data.totalPages).map((pageIndex, index, pages) => (
                <React.Fragment key={pageIndex}>
                  {index > 0 && pageIndex - pages[index - 1] > 1 && (
                    <span className="px-1 text-gray-400" aria-hidden>
                      ...
                    </span>
                  )}
                  <button
                    onClick={() => setPage(pageIndex)}
                    className={`px-3 py-1 rounded border ${
                      pageIndex === page
                        ? 'bg-ministere-500 text-white border-ministere-500'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {pageIndex + 1}
                  </button>
                </React.Fragment>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPage((currentPage) => Math.min(data.totalPages - 1, currentPage + 1))}
                disabled={page >= data.totalPages - 1}
              >
                →
              </Button>
            </div>
          </div>
        )}
      </div>

      <Modal
        isOpen={isSubmitModalOpen}
        onClose={closeSubmitModal}
        title="Nouvelle demande de conge"
        footer={(
          <>
            <Button variant="secondary" onClick={closeSubmitModal} disabled={submitting}>
              Annuler
            </Button>
            <Button type="submit" form="leave-submit-form" loading={submitting} disabled={hasInsufficientBalance || hasExceededEntitlement}>
              Envoyer
            </Button>
          </>
        )}
      >
        {loadingModalData ? (
          <div className="flex justify-center py-8">
            <Spinner size="md" />
          </div>
        ) : (
          <form id="leave-submit-form" onSubmit={handleSubmit} className="space-y-4">
            {submitError && <Alert type="error" message={submitError} />}
            {hasInsufficientBalance && (
              <Alert
                type="warning"
                message={`Solde insuffisant: ${requestedBusinessDays} jour(s) demandes pour ${formatBalanceValue(balance?.currentBalance)} jour(s) disponibles.`}
              />
            )}
            {selectedEntitlement && hasRemainingLimit && (
              <Alert
                type={hasExceededEntitlement ? 'warning' : 'info'}
                message={`Il vous reste ${formatBalanceValue(remainingDays)} jour(s) pour ce type de conge.`}
              />
            )}
            {selectedMotif?.isHalfPay && (
              <Alert type="warning" message="Attention, ce conge est remunere a demi-salaire." />
            )}
            {form.codeM === '12' && (
              <Alert
                type="info"
                message="Conge paternite: 7 jours autorises. Jusqu'a 10 jours autorises en cas de naissances multiples ou situation medicale avec justificatif."
              />
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="dateDebut" className="block text-sm font-medium text-gray-700 mb-1">
                  Date debut *
                </label>
                <input
                  id="dateDebut"
                  name="dateDebut"
                  type="date"
                  value={form.dateDebut}
                  onChange={handleFormChange}
                  className={`w-full px-3 py-2.5 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ministere-500 focus:border-ministere-500 ${
                    formErrors.dateDebut ? 'border-red-400' : 'border-gray-300'
                  }`}
                />
                {formErrors.dateDebut && <p className="mt-1 text-xs text-red-500">{formErrors.dateDebut}</p>}
              </div>
              <div>
                <label htmlFor="dateFin" className="block text-sm font-medium text-gray-700 mb-1">
                  Date fin *
                </label>
                <input
                  id="dateFin"
                  name="dateFin"
                  type="date"
                  value={form.dateFin}
                  onChange={handleFormChange}
                  className={`w-full px-3 py-2.5 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ministere-500 focus:border-ministere-500 ${
                    formErrors.dateFin ? 'border-red-400' : 'border-gray-300'
                  }`}
                />
                {formErrors.dateFin && <p className="mt-1 text-xs text-red-500">{formErrors.dateFin}</p>}
              </div>
            </div>

            <div>
              <label htmlFor="codeM" className="block text-sm font-medium text-gray-700 mb-1">
                Motif *
              </label>
              <select
                id="codeM"
                name="codeM"
                value={form.codeM}
                onChange={handleFormChange}
                className={`w-full px-3 py-2.5 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ministere-500 focus:border-ministere-500 ${
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
            </div>

            <div>
              <label htmlFor="motifCng" className="block text-sm font-medium text-gray-700 mb-1">
                Commentaire (optionnel)
              </label>
              <textarea
                id="motifCng"
                name="motifCng"
                rows={4}
                maxLength={1000}
                value={form.motifCng}
                onChange={handleFormChange}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ministere-500 focus:border-ministere-500"
                placeholder="Ajoutez un contexte si necessaire"
              />
            </div>

            {(isAttachmentRequired || selectedMotif) && (
              <div>
                <label htmlFor="attachment" className="block text-sm font-medium text-gray-700 mb-1">
                  Piece jointe {isAttachmentRequired ? '*' : '(optionnel)'}
                </label>
                <input
                  id="attachment"
                  name="attachment"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.docx"
                  required={isAttachmentRequired}
                  onChange={handleAttachmentChange}
                  className={`w-full px-3 py-2.5 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ministere-500 focus:border-ministere-500 ${
                    formErrors.attachment ? 'border-red-400' : 'border-gray-300'
                  }`}
                />
                {formErrors.attachment && <p className="mt-1 text-xs text-red-500">{formErrors.attachment}</p>}
              </div>
            )}

            <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700">
              Duree demandee (jours ouvrables): <span className="font-semibold">{requestedBusinessDays}</span>
              {usesCalendarLimit && (
                <span className="ml-2 text-gray-500">({requestedCalendarDays} jour(s) calendaires)</span>
              )}
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default MyLeaveRequestsPage;
