import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import {
  downloadCorrectionAttachment,
  getCorrectionRequests,
  reviewCorrectionRequest,
} from '../../services/MAJService';
import { buildPageWindow } from '../../hooks/usePersonnelPagination';
import Spinner from '../../components/ui/Spinner';
import StatCard from '../../components/ui/StatCard';
import { 
  ClipboardDocumentCheckIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  ArrowDownRightIcon,
  CheckIcon,
  XMarkIcon,
  DocumentArrowDownIcon
} from '@heroicons/react/24/outline';

const PAGE_SIZE = 50;

const statusFilters = [
  { value: 'PENDING', label: 'En attente' },
  { value: 'APPROVED', label: 'Approuvées' },
  { value: 'REJECTED', label: 'Rejetées' },
  { value: '', label: 'Tous les statuts' },
];

const statusLabels = {
  PENDING: 'EN ATTENTE',
  APPROVED: 'APPROUVÉE',
  REJECTED: 'REJETÉE',
};

const statusClassNames = {
  PENDING: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-emerald-100 text-emerald-800',
  REJECTED: 'bg-red-100 text-red-700',
};

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('fr-TN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const MAJRequestsPage = () => {
  const axiosPrivate = useAxiosPrivate();

  const [allRequests, setAllRequests] = useState([]);
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getCorrectionRequests(axiosPrivate, {
        page: 0,
        size: 10000, // Fetch a large number to ensure all are loaded
        status: '', // Fetch all statuses
      });
      setAllRequests(response.content || []);
    } catch {
      toast.error('Erreur lors du chargement des demandes de mise à jour.');
    } finally {
      setLoading(false);
    }
  }, [axiosPrivate]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const filteredRequests = allRequests.filter(
    (request) => statusFilter === '' || request.statut === statusFilter
  );
  
  const totalElements = filteredRequests.length;
  const totalPages = Math.ceil(totalElements / PAGE_SIZE);
  const paginatedRequests = filteredRequests.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleStatusFilterChange = (event) => {
    setStatusFilter(event.target.value);
    setPage(0);
  };

  const handleReview = async (id, status) => {
    setReviewingId(id);
    try {
      await reviewCorrectionRequest(axiosPrivate, id, status);
      toast.success(
        status === 'APPROVED' ? 'Demande validée.' : 'Demande rejetée.'
      );
      await loadRequests();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Mise à jour impossible.');
    } finally {
      setReviewingId(null);
    }
  };

  const handleDownload = async (id) => {
    setDownloadingId(id);
    try {
      const { blob, fileName } = await downloadCorrectionAttachment(axiosPrivate, id);
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objectUrl);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Téléchargement impossible.');
    } finally {
      setDownloadingId(null);
    }
  };

  const pendingCount = allRequests.filter((r) => r.statut === 'PENDING').length;
  const approvedCount = allRequests.filter((r) => r.statut === 'APPROVED').length;
  const rejectedCount = allRequests.filter((r) => r.statut === 'REJECTED').length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="VALIDATIONS EN ATTENTE"
          value={pendingCount}
          icon={ClipboardDocumentCheckIcon}
          accentColor="bg-blue-50 text-blue-600"
        />
        <StatCard
          title="APPROUVÉES"
          value={approvedCount}
          icon={CheckCircleIcon}
          accentColor="bg-green-50 text-green-600"
        />
        <StatCard
          title="REJETÉES"
          value={rejectedCount}
          icon={XCircleIcon}
          accentColor="bg-red-50 text-red-600"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="text-lg font-bold text-gray-800">Demandes en attente</h3>
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
                  <th className="px-6 py-4 text-left">DEMANDEUR</th>
                  <th className="px-6 py-4 text-left">CHAMP À METTRE À JOUR</th>
                  <th className="px-6 py-4 text-left">CHANGEMENT</th>
                  <th className="px-6 py-4 text-left">DATE SOUMISSION</th>
                  <th className="px-6 py-4 text-center">PIÈCE JOINTE</th>
                  <th className="px-6 py-4 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-gray-400">
                      Aucune demande de mise à jour.
                    </td>
                  </tr>
                ) : (
                  paginatedRequests.map((request) => {
                    const isPending = request.statut === 'PENDING';

                    return (
                      <tr key={request.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="px-6 py-4 text-gray-900 font-semibold flex flex-col gap-0.5">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 flex flex-shrink-0 items-center justify-center font-bold text-xs shadow-sm">
                              {request.fullName ? request.fullName.substring(0, 2).toUpperCase() : 'U'}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm">{request.fullName || '—'}</span>
                              <span className="text-xs text-gray-500 font-normal">ID: {request.matPers}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="bg-blue-100/50 text-blue-800 text-xs font-semibold px-2 py-1 flex max-w-max rounded">
                            {request.attributCible}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col text-sm">
                            <span className="text-gray-400 line-through decoration-red-400/50 decoration-2">
                              {request.ancienneValeur || '—'}
                            </span>
                            <div className="flex items-center gap-2 mt-0.5 font-medium text-gray-800 bg-gray-50 max-w-max px-2 py-0.5 rounded shadow-sm border border-gray-100">
                              <ArrowDownRightIcon className="w-3 h-3 text-red-500" strokeWidth={3} />
                              {request.nouvelleValeur || '—'}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-500">{formatDate(request.dateDemande)}</td>
                        <td className="px-6 py-4 text-center">
                          <button
                            className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors rounded-md hover:bg-blue-50 disabled:opacity-30"
                            disabled={!request.hasAttachment || downloadingId === request.id}
                            onClick={() => handleDownload(request.id)}
                            title="Télécharger la pièce jointe"
                          >
                            <DocumentArrowDownIcon className="w-5 h-5 mx-auto" />
                          </button>
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          {isPending ? (
                            <div className="flex items-center justify-end gap-3">
                              <button
                                onClick={() => handleReview(request.id, 'REJECTED')}
                                className="p-1.5 text-gray-400 hover:text-red-600 transition-colors rounded-md hover:bg-red-50"
                                disabled={reviewingId === request.id}
                              >
                                <XMarkIcon className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => handleReview(request.id, 'APPROVED')}
                                className="p-1.5 text-gray-400 hover:text-green-600 transition-colors rounded-md hover:bg-green-50"
                                disabled={reviewingId === request.id}
                              >
                                <CheckIcon className="w-5 h-5" />
                              </button>
                            </div>
                          ) : (
                            <span className={`text-xs font-bold uppercase tracking-wider ${statusClassNames[request.statut] || 'text-gray-400'}`}>
                              {statusLabels[request.statut] || request.statut}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 text-sm text-gray-500">
            <span>{totalElements} demande(s)</span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((currentPage) => Math.max(0, currentPage - 1))}
                disabled={page === 0}
                className="px-3 py-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
              >
                ←
              </button>
              {buildPageWindow(page, totalPages).map((pageIndex, index, pages) => (
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
              <button
                onClick={() => setPage((currentPage) => Math.min(totalPages - 1, currentPage + 1))}
                disabled={page >= totalPages - 1}
                className="px-3 py-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
              >
                →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MAJRequestsPage;
