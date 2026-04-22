import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import { buildPageWindow } from '../../hooks/usePersonnelPagination';
import { formatDate } from '../../utils/helpers';
import { getMyLeaveRequests } from '../../services/leaveService';

const PAGE_SIZE = 50;

const statusClassNames = {
  I: 'bg-amber-100 text-amber-800',
  O: 'bg-emerald-100 text-emerald-800',
  N: 'bg-red-100 text-red-700',
};

const MyLeaveRequestsPage = () => {
  const axiosPrivate = useAxiosPrivate();

  const [data, setData] = useState({
    content: [],
    totalPages: 0,
    totalElements: 0,
  });
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getMyLeaveRequests(axiosPrivate, {
        page,
        size: PAGE_SIZE,
      });
      setData(response);
    } catch {
      toast.error('Erreur lors du chargement de vos demandes de conge.');
    } finally {
      setLoading(false);
    }
  }, [axiosPrivate, page]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <h2 className="text-xl font-semibold text-gray-800">Mes demandes de conge</h2>
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
                  <th className="px-5 py-3 text-left">N° demande</th>
                  <th className="px-5 py-3 text-left">Date depot</th>
                  <th className="px-5 py-3 text-left">Date debut</th>
                  <th className="px-5 py-3 text-left">Date fin</th>
                  <th className="px-5 py-3 text-left">Motif</th>
                  <th className="px-5 py-3 text-left">Nb jours</th>
                  <th className="px-5 py-3 text-left">Statut</th>
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
                    <tr key={`${request.codSoc}-${request.matPers}-${request.numDcng}`} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 font-mono text-gray-700">{request.numDcng}</td>
                      <td className="px-5 py-3 text-gray-500">{formatDate(request.dateDemande)}</td>
                      <td className="px-5 py-3 text-gray-500">{formatDate(request.dateDebut)}</td>
                      <td className="px-5 py-3 text-gray-500">{formatDate(request.dateFin)}</td>
                      <td className="px-5 py-3 text-gray-700">{request.libMot || request.codeM || '—'}</td>
                      <td className="px-5 py-3 text-gray-700">{request.nbrJours ?? '—'}</td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
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
    </div>
  );
};

export default MyLeaveRequestsPage;
