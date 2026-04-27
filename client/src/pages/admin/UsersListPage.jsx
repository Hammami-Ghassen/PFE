import React, { useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import { getEstablishments, getUsers, updatePersonnelRole } from '../../services/userService';
import usePersonnelPagination, { buildPageWindow } from '../../hooks/usePersonnelPagination';
import useEstablishments from '../../hooks/useEstablishments';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import { 
  ArrowDownTrayIcon, 
  UserPlusIcon, 
  MagnifyingGlassIcon,
  EnvelopeIcon,
  PhoneIcon,
  PencilIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

const roleOptions = ['ADMIN', 'DIRECTEUR', 'AGENT'];
const PAGE_SIZE = 50;

const UsersListPage = () => {
  const axiosPrivate = useAxiosPrivate();

  const fetchUsersPage = useCallback(
    (params) => getUsers(axiosPrivate, params).catch((err) => {
      toast.error('Erreur lors du chargement du personnel.');
      throw err;
    }),
    [axiosPrivate]
  );

  const {
    data,
    loading,
    page,
    searchInput,
    codSoc,
    setPage,
    setSearchInput,
    submitSearch,
    selectEstablishment,
    refresh,
  } = usePersonnelPagination(fetchUsersPage, PAGE_SIZE);

  const loadEstablishments = useCallback(
    () => getEstablishments(axiosPrivate),
    [axiosPrivate]
  );
  const { establishments, error: establishmentsError } = useEstablishments(loadEstablishments);

  // Keeps user feedback explicit without triggering toast side effects during render.
  useEffect(() => {
    if (establishmentsError) {
      toast.error('Erreur lors du chargement des etablissements.');
    }
  }, [establishmentsError]);

  const handleRoleChange = async (matPers, newRole) => {
    try {
      await updatePersonnelRole(axiosPrivate, matPers, newRole);
      toast.success('Role mis a jour.');
      refresh();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Mise a jour du role impossible.');
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

        <div className="flex gap-3 shrink-0">
          <Button variant="outline" className="text-gray-700 bg-white border-gray-300 hover:bg-gray-50 flex items-center gap-2">
            <ArrowDownTrayIcon className="w-4 h-4" />
            Export Directory
          </Button>
          <Button className="bg-accent-red hover:bg-red-700 border-none flex items-center gap-2">
            <UserPlusIcon className="w-4 h-4" />
            Add Personnel
          </Button>
        </div>
      </div>

      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-end gap-5">
        <form onSubmit={submitSearch} className="flex-1 flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Search Personnel</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Name, Email, or Matricule"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-ministere-500 focus:border-transparent transition-colors shadow-sm"
            />
          </div>
        </form>

        <div className="w-full md:w-56 flex flex-col gap-1.5 shrink-0">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Department</label>
          <select
            value={codSoc}
            onChange={(e) => selectEstablishment(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-ministere-500 focus:border-transparent transition-colors shadow-sm"
          >
            <option value="">All Departments</option>
            {establishments.map((est) => (
              <option key={est.codSoc} value={est.codSoc}>
                {est.codSoc} - {est.libSoc}
              </option>
            ))}
          </select>
        </div>

        <div className="w-full md:w-48 flex flex-col gap-1.5 shrink-0">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Role / Grade</label>
          <select disabled className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-400 cursor-not-allowed">
            <option>All Roles</option>
          </select>
        </div>

        <div className="w-full md:w-48 flex flex-col gap-1.5 shrink-0">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Status</label>
          <select disabled className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-400 cursor-not-allowed">
            <option>All Statuses</option>
          </select>
        </div>

        <button 
          onClick={() => { setSearchInput(''); selectEstablishment(''); }}
          type="button" 
          className="text-sm font-semibold text-ministere-600 hover:text-ministere-800 pb-2 px-2"
        >
          Clear Filters
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50/80 text-gray-500 uppercase tracking-wider text-xs font-semibold border-b border-gray-200">
                <tr>
                  <th className="px-5 py-4 text-left font-bold min-w-[250px]">Employee</th>
                  <th className="px-5 py-4 text-left font-bold">Department & Role</th>
                  <th className="px-5 py-4 text-left font-bold">Contact Info</th>
                  <th className="px-5 py-4 text-left font-bold">Status</th>
                  <th className="px-5 py-4 text-right font-bold w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {data.content.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-gray-400">Aucun personnel trouve.</td>
                  </tr>
                ) : (
                  data.content.map((person) => (
                    <tr key={person.matPers} className="hover:bg-gray-50 transition-colors group cursor-pointer">
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-ministere-100 flex items-center justify-center text-ministere-700 font-bold text-sm shrink-0 border border-ministere-200 shadow-sm">
                            {person.matPers ? person.matPers.substring(0, 2) : 'MP'}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">{person.matPers}</div>
                            <div className="text-xs font-medium text-gray-500 mt-0.5">Role: <Badge label={person.codUser || 'N/A'} className="px-1.5 py-0 text-[10px]" /></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-gray-900 font-medium">{person.codSoc || 'No Code'}</span>
                          <span className="text-gray-500 text-xs">{person.establishmentName || 'No establishment'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1.5">
                          {person.email ? (
                            <div className="flex items-center gap-2 text-gray-700">
                              <EnvelopeIcon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span className="text-sm truncate max-w-[200px]">{person.email}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 italic">No email</span>
                          )}
                          {person.phone ? (
                            <div className="flex items-center gap-2 text-gray-700">
                              <PhoneIcon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span className="text-sm">{person.phone}</span>
                            </div>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200/50 shadow-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5"></span>
                          Active User
                        </span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-right">
                        <div className="inline-flex items-center">
                          <select
                            defaultValue={person.codUser}
                            onChange={(e) => handleRoleChange(person.matPers, e.target.value)}
                            className="mr-3 px-2 py-1.5 border border-gray-300 rounded-lg text-xs bg-white focus:ring-1 focus:ring-ministere-500"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {roleOptions.map((role) => (
                              <option key={role} value={role}>{role}</option>
                            ))}
                          </select>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="p-1.5 text-gray-400 hover:text-ministere-600 hover:bg-ministere-50 rounded-lg transition-colors" title="Edit Personnel">
                              <PencilIcon className="w-4 h-4" />
                            </button>
                            <button className="p-1.5 text-gray-400 hover:text-accent-red hover:bg-red-50 rounded-lg transition-colors" title="View Profile">
                              <EyeIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
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
            <span>{data.totalElements} resultat(s)</span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
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
                      pageIndex === page ? 'bg-ministere-500 text-white border-ministere-500' : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {pageIndex + 1}
                  </button>
                </React.Fragment>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(data.totalPages - 1, p + 1))}
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

export default UsersListPage;
