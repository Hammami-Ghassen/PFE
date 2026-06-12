import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import {
  getEstablishments,
  getUserDetails,
  getUsers,
  updatePersonnel,
  updatePersonnelRole,
} from '../../services/userService';
import usePersonnelPagination, { buildPageWindow } from '../../hooks/usePersonnelPagination';
import useEstablishments from '../../hooks/useEstablishments';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Spinner from '../../components/ui/Spinner';
import {
  MagnifyingGlassIcon,
  EnvelopeIcon,
  PhoneIcon,
  PencilIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

const roleOptions = ['ADMIN', 'DIRECTEUR', 'AGENT'];
const PAGE_SIZE = 50;

const emptyEditForm = { codUser: 'AGENT', email: '', phone: '' };

const displayValue = (value) => value || '-';

const UsersListPage = () => {
  const axiosPrivate = useAxiosPrivate();

  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState(null);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [savingEdit, setSavingEdit] = useState(false);

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
    resetFilters,
    refresh,
  } = usePersonnelPagination(fetchUsersPage, PAGE_SIZE);

  const loadEstablishments = useCallback(
    () => getEstablishments(axiosPrivate),
    [axiosPrivate]
  );
  const { establishments, error: establishmentsError } = useEstablishments(loadEstablishments);

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

  const openDetails = async (person) => {
    setSelectedProfile(null);
    setDetailsModalOpen(true);
    setDetailsLoading(true);
    try {
      const profile = await getUserDetails(axiosPrivate, person.matPers);
      setSelectedProfile(profile);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Chargement du profil impossible.');
      setDetailsModalOpen(false);
    } finally {
      setDetailsLoading(false);
    }
  };

  const openEdit = (person) => {
    setEditingPerson(person);
    setEditForm({
      codUser: person.codUser || 'AGENT',
      email: person.email || '',
      phone: person.phone || '',
    });
    setEditModalOpen(true);
  };

  const closeEdit = () => {
    if (savingEdit) return;
    setEditModalOpen(false);
    setEditingPerson(null);
    setEditForm(emptyEditForm);
  };

  const handleEditChange = (event) => {
    const { name, value } = event.target;
    setEditForm((current) => ({ ...current, [name]: value }));
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();
    if (!editingPerson) return;

    setSavingEdit(true);
    try {
      await updatePersonnel(axiosPrivate, editingPerson.matPers, {
        codUser: editForm.codUser,
        email: editForm.email.trim() || null,
        phone: editForm.phone.trim() || null,
      });
      toast.success('Personnel mis a jour.');
      setEditModalOpen(false);
      setEditingPerson(null);
      await refresh();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Mise a jour impossible.');
    } finally {
      setSavingEdit(false);
    }
  };

  const profileFields = selectedProfile ? [
    ['Matricule', selectedProfile.matPers],
    ['Nom complet', selectedProfile.fullName],
    ['Role', selectedProfile.role],
    ['Etablissement', selectedProfile.establishmentName || selectedProfile.codSoc],
    ['Email', selectedProfile.email],
    ['Telephone', selectedProfile.phone],
    ['Adresse', selectedProfile.adresse],
    ['Service', selectedProfile.service],
    ['Grade', selectedProfile.grade],
    ['Poste', selectedProfile.posteTravail],
  ] : [];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-end gap-5">
        <form onSubmit={submitSearch} className="flex-1 flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Rechercher du personnel</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Nom, email, telephone ou matricule"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-ministere-500 focus:border-transparent transition-colors shadow-sm"
            />
          </div>
        </form>

        <div className="w-full md:w-56 flex flex-col gap-1.5 shrink-0">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Etablissement</label>
          <select
            value={codSoc}
            onChange={(e) => selectEstablishment(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-ministere-500 focus:border-transparent transition-colors shadow-sm"
          >
            <option value="">Tous les etablissements</option>
            {establishments.map((est) => (
              <option key={est.codSoc} value={est.codSoc}>
                {est.codSoc} - {est.libSoc}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={resetFilters}
          type="button"
          className="text-sm font-semibold text-ministere-600 hover:text-ministere-800 pb-2 px-2"
        >
          Reinitialiser les filtres
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
                  <th className="px-5 py-4 text-left font-bold min-w-[250px]">Agent</th>
                  <th className="px-5 py-4 text-left font-bold">Etablissement</th>
                  <th className="px-5 py-4 text-left font-bold">Contact</th>
                  <th className="px-5 py-4 text-right font-bold w-32">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {data.content.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-12 text-gray-400">Aucun personnel trouve.</td>
                  </tr>
                ) : (
                  data.content.map((person) => (
                    <tr key={person.matPers} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-ministere-100 flex items-center justify-center text-ministere-700 font-bold text-sm shrink-0 border border-ministere-200 shadow-sm">
                            {person.prenomPers ? person.prenomPers.substring(0, 1).toUpperCase() + (person.nomPers ? person.nomPers.substring(0, 1).toUpperCase() : '') : (person.matPers ? person.matPers.substring(0, 2) : 'MP')}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">{person.prenomPers && person.nomPers ? `${person.prenomPers} ${person.nomPers}` : person.matPers}</div>
                            {person.prenomPers && person.nomPers && <div className="text-xs font-medium text-gray-500 mt-0.5">Matricule : {person.matPers}</div>}
                            <div className="text-xs font-medium text-gray-500 mt-0.5">Role : <Badge label={person.codUser || 'N/D'} className="px-1.5 py-0 text-[10px]" /></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-gray-900 font-medium">{person.codSoc || 'Sans code'}</span>
                          <span className="text-gray-500 text-xs">{person.establishmentName || 'Sans etablissement'}</span>
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
                            <span className="text-xs text-gray-400 italic">Aucun email</span>
                          )}
                          {person.phone ? (
                            <div className="flex items-center gap-2 text-gray-700">
                              <PhoneIcon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span className="text-sm">{person.phone}</span>
                            </div>
                          ) : null}
                        </div>
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap text-right">
                        <div className="inline-flex items-center">
                          <select
                            value={person.codUser || ''}
                            onChange={(e) => handleRoleChange(person.matPers, e.target.value)}
                            className="mr-3 px-2 py-1.5 border border-gray-300 rounded-lg text-xs bg-white focus:ring-1 focus:ring-ministere-500"
                          >
                            {roleOptions.map((role) => (
                              <option key={role} value={role}>{role}</option>
                            ))}
                          </select>
                          <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => openEdit(person)}
                              className="p-1.5 text-gray-400 hover:text-ministere-600 hover:bg-ministere-50 rounded-lg transition-colors"
                              title="Modifier le personnel"
                            >
                              <PencilIcon className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openDetails(person)}
                              className="p-1.5 text-gray-400 hover:text-accent-red hover:bg-red-50 rounded-lg transition-colors"
                              title="Voir le profil"
                            >
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
                &lt;
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
                &gt;
              </button>
            </div>
          </div>
        )}
      </div>

      <Modal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        title="Profil du personnel"
        maxWidthClass="max-w-3xl"
        footer={<Button variant="secondary" onClick={() => setDetailsModalOpen(false)}>Fermer</Button>}
      >
        {detailsLoading ? (
          <div className="flex justify-center py-10">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {profileFields.map(([label, value]) => (
              <div key={label} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold">{label}</p>
                <p className="mt-1 text-sm font-medium text-gray-900 break-words">{displayValue(value)}</p>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <Modal
        isOpen={editModalOpen}
        onClose={closeEdit}
        title="Modifier le personnel"
        maxWidthClass="max-w-xl"
        footer={(
          <>
            <Button variant="secondary" onClick={closeEdit} disabled={savingEdit}>Annuler</Button>
            <Button type="submit" form="admin-personnel-edit-form" loading={savingEdit}>Enregistrer</Button>
          </>
        )}
      >
        <form id="admin-personnel-edit-form" onSubmit={handleEditSubmit} className="space-y-4">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Agent</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">
              {editingPerson?.prenomPers && editingPerson?.nomPers ? `${editingPerson.prenomPers} ${editingPerson.nomPers}` : editingPerson?.matPers}
            </p>
            <p className="text-xs text-gray-500">Matricule : {editingPerson?.matPers}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              name="codUser"
              value={editForm.codUser}
              onChange={handleEditChange}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ministere-500"
            >
              {roleOptions.map((role) => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={editForm.email}
              onChange={handleEditChange}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ministere-500"
              placeholder="email@domaine.tn"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telephone</label>
            <input
              type="text"
              name="phone"
              value={editForm.phone}
              onChange={handleEditChange}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ministere-500"
              placeholder="Numero de telephone"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default UsersListPage;
