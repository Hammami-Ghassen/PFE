import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import StatCard from '../../components/ui/StatCard';
import LeaveValidationDetailModal from '../../components/leave/LeaveValidationDetailModal';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import { buildPageWindow } from '../../hooks/usePersonnelPagination';
import { formatDate } from '../../utils/helpers';
import {
  getLeaveBalanceByMatPers,
  getLeaveHolidays,
  getLeaveValidationQueue,
  reviewLeaveRequest,
} from '../../services/leaveService';
import {
  ClipboardDocumentCheckIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';

const PAGE_SIZE = 50;

const statusFilters = [
  { value: 'I', label: 'En attente' },
  { value: 'O', label: 'Acceptees' },
  { value: 'N', label: 'Refusees' },
  { value: '', label: 'Tous les statuts' },
];

const statusClassNames = {
  I: 'bg-amber-100 text-amber-800',
  O: 'bg-emerald-100 text-emerald-800',
  N: 'bg-red-100 text-red-700',
};

const LeaveValidationPage = () => {
  const axiosPrivate = useAxiosPrivate();

  const [data, setData] = useState({
    content: [],
    totalPages: 0,
    totalElements: 0,
  });
  const [statusFilter, setStatusFilter] = useState('I');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [holidays, setHolidays] = useState([]);

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailSubmitting, setDetailSubmitting] = useState(false);
  const [loadingSelectedBalance, setLoadingSelectedBalance] = useState(false);
  const [selectedBalance, setSelectedBalance] = useState(null);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getLeaveValidationQueue(axiosPrivate, {
        page,
        size: PAGE_SIZE,
        status: statusFilter,
      });
      setData(response);
    } catch {
      toast.error('Erreur lors du chargement des demandes a traiter.');
    } finally {
      setLoading(false);
    }
  }, [axiosPrivate, page, statusFilter]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  useEffect(() => {
    const loadHolidays = async () => {
      try {
        const response = await getLeaveHolidays(axiosPrivate);
        setHolidays(Array.isArray(response) ? response : []);
      } catch {
        toast.error('Erreur lors du chargement des jours feries.');
      }
    };

    loadHolidays();
  }, [axiosPrivate]);

  const handleStatusFilterChange = (event) => {
    setStatusFilter(event.target.value);
    setPage(0);
  };

  const closeDetailModal = () => {
    if (detailSubmitting) {
      return;
    }
    setIsDetailModalOpen(false);
    setSelectedRequest(null);
    setSelectedBalance(null);
  };

  const openDetailModal = async (request) => {
    setSelectedRequest(request);
    setIsDetailModalOpen(true);
    setSelectedBalance(null);
    setLoadingSelectedBalance(true);

    try {
      const response = await getLeaveBalanceByMatPers(axiosPrivate, request.matPers);
      setSelectedBalance(response);
    } catch {
      toast.error('Impossible de charger le solde du demandeur.');
    } finally {
      setLoadingSelectedBalance(false);
    }
  };

  const handleReviewFromModal = async (status, comment) => {
    if (!selectedRequest) return;

    setDetailSubmitting(true);
    try {
      await reviewLeaveRequest(axiosPrivate, {
        codSoc: selectedRequest.codSoc,
        matPers: selectedRequest.matPers,
        numDcng: selectedRequest.numDcng,
        status,
        comment,
      });

      toast.success(status === 'O' ? 'Demande acceptee.' : 'Demande refusee.');
      setIsDetailModalOpen(false);
      setSelectedRequest(null);
      setSelectedBalance(null);
      await loadQueue();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Traitement impossible.');
    } finally {
      setDetailSubmitting(false);
    }
  };

  const pendingCount = data.content.filter((request) => request.statusCode === 'I').length;
  const approvedCount = data.content.filter((request) => request.statusCode === 'O').length;
  const rejectedCount = data.content.filter((request) => request.statusCode === 'N').length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">


      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="DEMANDES EN ATTENTE"
          value={pendingCount || '0'}
          subtitle="À traiter en priorité"
          icon={ClipboardDocumentCheckIcon}
          accentColor="bg-blue-50 text-blue-600"
        />
        <StatCard
          title="APPROUVÉES AUJOURD'HUI"
          value={approvedCount || '0'}
          subtitle="Traitées par votre équipe"
          icon={CheckCircleIcon}
          accentColor="bg-green-50 text-green-600"
        />
        <StatCard
          title="REFUSÉES"
          value={rejectedCount || '0'}
          subtitle="Retournées au demandeur"
          icon={XCircleIcon}
          accentColor="bg-red-50 text-red-600"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="text-lg font-bold text-gray-800">File de validation</h3>
          <div className="flex gap-3">
            <select
              value={statusFilter}
              onChange={handleStatusFilterChange}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-700 min-w-[150px]"
            >
              {statusFilters.map((statusOption) => (
                <option key={statusOption.label} value={statusOption.value}>
                  {statusOption.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80 text-gray-500 text-xs font-bold uppercase tracking-widest border-b border-gray-200">
                  <th className="px-6 py-4 text-left">MAT_PERS</th>
                  <th className="px-6 py-4 text-left">NOM</th>
                  <th className="px-6 py-4 text-left">RÔLE</th>
                  <th className="px-6 py-4 text-left">DATES</th>
                  <th className="px-6 py-4 text-left">MOTIF</th>
                  <th className="px-6 py-4 text-left">STATUT</th>
                  <th className="px-6 py-4 text-right">DÉTAILS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.content.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-gray-400">
                      Aucune demande a traiter.
                    </td>
                  </tr>
                ) : (
                  data.content.map((request) => {
                    const rowKey = `${request.codSoc}-${request.matPers}-${request.numDcng}`;

                    return (
                      <tr key={rowKey} className="hover:bg-blue-50/30 transition-colors">
                        <td className="px-6 py-4 text-gray-600 font-medium">{request.matPers}</td>
                        <td className="px-6 py-4 text-gray-900 font-semibold flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 flex flex-shrink-0 items-center justify-center font-bold text-xs">
                            {request.fullName ? request.fullName.substring(0, 2).toUpperCase() : 'U'}
                          </div>
                          {request.fullName || '—'}
                        </td>
                        <td className="px-6 py-4 text-ministere-600">{request.demandeurRole || '—'}</td>
                        <td className="px-6 py-4 text-gray-600 text-xs leading-relaxed">
                          <div className="font-semibold text-gray-900 mb-0.5">{formatDate(request.dateDebut)}</div>
                          <div className="text-gray-400">au {formatDate(request.dateFin)}</div>
                        </td>
                        <td className="px-6 py-4 text-gray-700">{request.libMot || request.codeM || '—'}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex px-3 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wider ${
                              statusClassNames[request.statusCode] || 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {request.statusLabel || request.statusCode}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => openDetailModal(request)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-ministere-700 bg-ministere-50 border border-ministere-200 rounded-md hover:bg-ministere-100 transition-colors"
                          >
                            <EyeIcon className="w-4 h-4" />
                            Voir détails
                          </button>
                        </td>
                      </tr>
                    );
                  })
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

      <LeaveValidationDetailModal
        isOpen={isDetailModalOpen}
        onClose={closeDetailModal}
        request={selectedRequest}
        holidays={holidays}
        balance={selectedBalance}
        loadingBalance={loadingSelectedBalance}
        submitting={detailSubmitting}
        onApprove={(comment) => handleReviewFromModal('O', comment)}
        onReject={(comment) => handleReviewFromModal('N', comment)}
      />
    </div>
  );
};

export default LeaveValidationPage;
