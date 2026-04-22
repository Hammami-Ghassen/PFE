import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import { buildPageWindow } from '../../hooks/usePersonnelPagination';
import { formatDate } from '../../utils/helpers';
import {
  getLeaveValidationQueue,
  reviewLeaveRequest,
} from '../../services/leaveService';

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
  const [reviewingKey, setReviewingKey] = useState(null);

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

  const handleStatusFilterChange = (event) => {
    setStatusFilter(event.target.value);
    setPage(0);
  };

  const handleReview = async (request, status) => {
    const key = `${request.codSoc}-${request.matPers}-${request.numDcng}`;
    setReviewingKey(key);

    try {
      await reviewLeaveRequest(axiosPrivate, {
        codSoc: request.codSoc,
        matPers: request.matPers,
        numDcng: request.numDcng,
        status,
      });
      toast.success(status === 'O' ? 'Demande acceptee.' : 'Demande refusee.');
      await loadQueue();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Traitement impossible.');
    } finally {
      setReviewingKey(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <h2 className="text-xl font-semibold text-gray-800">Validation des conges</h2>

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
                  <th className="px-5 py-3 text-left">Role</th>
                  <th className="px-5 py-3 text-left">Date debut</th>
                  <th className="px-5 py-3 text-left">Date fin</th>
                  <th className="px-5 py-3 text-left">Motif</th>
                  <th className="px-5 py-3 text-left">Statut</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.content.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-gray-400">
                      Aucune demande a traiter.
                    </td>
                  </tr>
                ) : (
                  data.content.map((request) => {
                    const rowKey = `${request.codSoc}-${request.matPers}-${request.numDcng}`;
                    const isPending = request.statusCode === 'I';
                    const isReviewing = reviewingKey === rowKey;

                    return (
                      <tr key={rowKey} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3 font-mono text-gray-700">{request.matPers}</td>
                        <td className="px-5 py-3 text-gray-700">{request.fullName || '—'}</td>
                        <td className="px-5 py-3 text-gray-700">{request.demandeurRole || '—'}</td>
                        <td className="px-5 py-3 text-gray-500">{formatDate(request.dateDebut)}</td>
                        <td className="px-5 py-3 text-gray-500">{formatDate(request.dateFin)}</td>
                        <td className="px-5 py-3 text-gray-700">{request.libMot || request.codeM || '—'}</td>
                        <td className="px-5 py-3">
                          <span
                            className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                              statusClassNames[request.statusCode] || 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {request.statusLabel || request.statusCode}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          {isPending ? (
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleReview(request, 'O')}
                                loading={isReviewing}
                                disabled={isReviewing}
                              >
                                Accepter
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                onClick={() => handleReview(request, 'N')}
                                loading={isReviewing}
                                disabled={isReviewing}
                              >
                                Refuser
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
    </div>
  );
};

export default LeaveValidationPage;
