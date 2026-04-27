import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import StatCard from '../../components/ui/StatCard';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import { buildPageWindow } from '../../hooks/usePersonnelPagination';
import { formatDate } from '../../utils/helpers';
import { getMyLeaveRequests } from '../../services/leaveService';
import {
  CalendarDaysIcon,
  ClockIcon,
  CheckCircleIcon,
  ShieldExclamationIcon,
} from '@heroicons/react/24/outline';

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
    <div className="space-y-8 max-w-7xl mx-auto pb-10">


      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="TOTAL REQUESTS"
          value={data.totalElements || '0'}
          icon={CalendarDaysIcon}
          accentColor="bg-blue-50 text-blue-600"
        />
        <StatCard
          title="PENDING APPROVAL"
          value={data.content.filter(r => r.statusCode === 'I').length || '0'}
          icon={ClockIcon}
          accentColor="bg-amber-50 text-amber-600"
        />
        <StatCard
          title="APPROVED (YEAR)"
          value={data.content.filter(r => r.statusCode === 'O').length || '0'}
          icon={CheckCircleIcon}
          accentColor="bg-green-50 text-green-600"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-800">Request History</h3>
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
                  <th className="px-6 py-4 text-left">REQ NUM</th>
                  <th className="px-6 py-4 text-left">SUBMIT DATE</th>
                  <th className="px-6 py-4 text-left">DATE RANGE</th>
                  <th className="px-6 py-4 text-left">TYPE REASON</th>
                  <th className="px-6 py-4 text-center">DURATION</th>
                  <th className="px-6 py-4 text-right">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.content.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-gray-400">
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
                        <div className="text-gray-400">to {formatDate(request.dateFin)}</div>
                      </td>
                      <td className="px-6 py-4 text-gray-700">{request.libMot || request.codeM || '—'}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex px-3 py-1 bg-gray-50 text-gray-600 rounded font-medium border border-gray-200 shadow-sm">
                          {request.nbrJours ?? '—'} Days
                        </span>
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
    </div>
  );
};

export default MyLeaveRequestsPage;
