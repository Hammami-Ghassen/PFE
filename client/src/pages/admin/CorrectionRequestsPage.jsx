import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import {
  downloadCorrectionAttachment,
  getCorrectionRequests,
  reviewCorrectionRequest,
} from '../../services/correctionService';
import { buildPageWindow } from '../../hooks/usePersonnelPagination';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';

const PAGE_SIZE = 50;

const statusFilters = [
  { value: 'PENDING', label: 'En attente' },
  { value: 'APPROVED', label: 'Approuvees' },
  { value: 'REJECTED', label: 'Rejetees' },
  { value: '', label: 'Tous les statuts' },
];

const statusLabels = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
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

const CorrectionRequestsPage = () => {
  const axiosPrivate = useAxiosPrivate();

  const [data, setData] = useState({
    content: [],
    totalPages: 0,
    totalElements: 0,
  });
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getCorrectionRequests(axiosPrivate, {
        page,
        size: PAGE_SIZE,
        status: statusFilter,
      });
      setData(response);
    } catch {
      toast.error('Erreur lors du chargement des demandes de correction.');
    } finally {
      setLoading(false);
    }
  }, [axiosPrivate, page, statusFilter]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

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
      toast.error(err?.response?.data?.message || 'Mise a jour impossible.');
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
      toast.error(err?.response?.data?.message || 'Telechargement impossible.');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <h2 className="text-xl font-semibold text-gray-800">Demandes de correction</h2>

        <select
          value={statusFilter}
          onChange={handleStatusFilterChange}
          className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white"
        >
          {statusFilters.map((statusOption) => (
            <option key={statusOption.label} value={statusOption.value}>
              {statusOption.label}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wider">
                  <th className="px-5 py-3 text-left">MAT_PERS</th>
                  <th className="px-5 py-3 text-left">Nom</th>
                  <th className="px-5 py-3 text-left">Attribut</th>
                  <th className="px-5 py-3 text-left">Ancienne valeur</th>
                  <th className="px-5 py-3 text-left">Nouvelle valeur</th>
                  <th className="px-5 py-3 text-left">Date demande</th>
                  <th className="px-5 py-3 text-left">Pièce jointe</th>
                  <th className="px-5 py-3 text-left">Statut</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.content.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-gray-400">
                      Aucune demande de correction.
                    </td>
                  </tr>
                ) : (
                  data.content.map((request) => {
                    const isPending = request.statut === 'PENDING';

                    return (
                      <tr key={request.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3 font-mono text-gray-700">{request.matPers}</td>
                        <td className="px-5 py-3 text-gray-700">{request.fullName || '—'}</td>
                        <td className="px-5 py-3 text-gray-700">{request.attributCible}</td>
                        <td className="px-5 py-3 text-gray-500">{request.ancienneValeur || '—'}</td>
                        <td className="px-5 py-3 text-gray-700">{request.nouvelleValeur || '—'}</td>
                        <td className="px-5 py-3 text-gray-500">{formatDate(request.dateDemande)}</td>
                        <td className="px-5 py-3 text-gray-500">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={!request.hasAttachment || downloadingId === request.id}
                            loading={downloadingId === request.id}
                            onClick={() => handleDownload(request.id)}
                          >
                            Télécharger
                          </Button>
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                              statusClassNames[request.statut] || 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {statusLabels[request.statut] || request.statut}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          {isPending ? (
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleReview(request.id, 'APPROVED')}
                                loading={reviewingId === request.id}
                                disabled={reviewingId === request.id}
                              >
                                Valider
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                onClick={() => handleReview(request.id, 'REJECTED')}
                                loading={reviewingId === request.id}
                                disabled={reviewingId === request.id}
                              >
                                Rejeter
                              </Button>
                            </div>
                          ) : (
                            <span className="text-gray-400">Traitee</span>
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

        {data.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 text-sm text-gray-500">
            <span>{data.totalElements} demande(s)</span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((currentPage) => Math.max(0, currentPage - 1))}
                disabled={page === 0}
                className="px-3 py-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
              >
                ←
              </button>
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
              <button
                onClick={() => setPage((currentPage) => Math.min(data.totalPages - 1, currentPage + 1))}
                disabled={page >= data.totalPages - 1}
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

export default CorrectionRequestsPage;
