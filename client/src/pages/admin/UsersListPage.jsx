import React, { useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import { getEstablishments, getUsers, updatePersonnelRole } from '../../services/userService';
import usePersonnelPagination, { buildPageWindow } from '../../hooks/usePersonnelPagination';
import useEstablishments from '../../hooks/useEstablishments';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';

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
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <form onSubmit={submitSearch} className="flex gap-2 flex-1 max-w-xl">
          <input
            type="text"
            placeholder="Rechercher MAT_PERS..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-ministere-500 focus:border-transparent"
          />
          <Button type="submit" size="sm">Rechercher</Button>
        </form>

        <select
          value={codSoc}
          onChange={(e) => selectEstablishment(e.target.value)}
          className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white"
        >
          <option value="">Tous les etablissements</option>
          {establishments.map((est) => (
            <option key={est.codSoc} value={est.codSoc}>
              {est.codSoc} - {est.libSoc}
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
                  <th className="px-5 py-3 text-left">COD_USER</th>
                  <th className="px-5 py-3 text-left">COD_SOC</th>
                  <th className="px-5 py-3 text-left">Etablissement</th>
                  <th className="px-5 py-3 text-left">Email</th>
                  <th className="px-5 py-3 text-left">Telephone</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.content.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-gray-400">Aucun personnel trouve.</td>
                  </tr>
                ) : (
                  data.content.map((person) => (
                    <tr key={person.matPers} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 font-mono text-gray-700">{person.matPers}</td>
                      <td className="px-5 py-3"><Badge label={person.codUser} /></td>
                      <td className="px-5 py-3 text-gray-700">{person.codSoc || '—'}</td>
                      <td className="px-5 py-3 text-gray-700">{person.establishmentName || '—'}</td>
                      <td className="px-5 py-3 text-gray-500">{person.email || '—'}</td>
                      <td className="px-5 py-3 text-gray-500">{person.phone || '—'}</td>
                      <td className="px-5 py-3 text-right">
                        <select
                          defaultValue={person.codUser}
                          onChange={(e) => handleRoleChange(person.matPers, e.target.value)}
                          className="px-2 py-1.5 border border-gray-300 rounded-lg text-xs bg-white"
                        >
                          {roleOptions.map((role) => (
                            <option key={role} value={role}>{role}</option>
                          ))}
                        </select>
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
