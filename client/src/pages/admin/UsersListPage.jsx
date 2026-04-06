import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import {
  getUsers,
  toggleUserStatus,
  deleteUser,
  resetUserPassword,
} from '../../services/userService';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import Modal from '../../components/ui/Modal';
import {
  PencilIcon,
  TrashIcon,
  KeyIcon,
  PlusIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { formatDate } from '../../utils/helpers';
import { ClipboardDocumentIcon } from '@heroicons/react/24/outline';

const UsersListPage = () => {
  const axiosPrivate = useAxiosPrivate();

  const [data, setData] = useState({ content: [], totalPages: 0, totalElements: 0 });
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(false);

  // Delete modal
  const [deleteModal, setDeleteModal] = useState({ open: false, user: null });
  const [deleting, setDeleting] = useState(false);

  // Reset password modal
  const [resetModal, setResetModal] = useState({ open: false, generatedPassword: null });

  const fetchUsers = useCallback(() => {
    setLoading(true);
    getUsers(axiosPrivate, { page, size: 10, search })
      .then(setData)
      .catch(() => toast.error('Erreur lors du chargement des utilisateurs.'))
      .finally(() => setLoading(false));
  }, [axiosPrivate, page, search]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(0);
  };

  const handleToggle = async (user) => {
    try {
      await toggleUserStatus(axiosPrivate, user.id);
      toast.success(`Utilisateur ${user.active ? 'désactivé' : 'activé'} avec succès.`);
      fetchUsers();
    } catch {
      toast.error('Erreur lors du changement de statut.');
    }
  };

  const confirmDelete = (user) => setDeleteModal({ open: true, user });

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteUser(axiosPrivate, deleteModal.user.id);
      toast.success('Utilisateur supprimé avec succès.');
      setDeleteModal({ open: false, user: null });
      fetchUsers();
    } catch {
      toast.error('Erreur lors de la suppression.');
    } finally {
      setDeleting(false);
    }
  };

  const handleResetPassword = async (userId) => {
    try {
      const result = await resetUserPassword(axiosPrivate, userId);
      setResetModal({ open: true, generatedPassword: result.generatedPassword });
    } catch {
      toast.error('Erreur lors de la réinitialisation du mot de passe.');
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(resetModal.generatedPassword);
    toast.success('Mot de passe copié !');
  };

  return (
    <div className="space-y-5">
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 max-w-sm">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par CIN ou nom..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-ministere-500 focus:border-transparent"
            />
          </div>
          <Button type="submit" size="sm">
            Rechercher
          </Button>
        </form>
        <Link to="/admin/users/new">
          <Button>
            <PlusIcon className="w-4 h-4 mr-1.5" />
            Nouvel Utilisateur
          </Button>
        </Link>
      </div>

      {/* Table */}
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
                  <th className="px-5 py-3 text-left">CIN</th>
                  <th className="px-5 py-3 text-left">Nom complet</th>
                  <th className="px-5 py-3 text-left">Email</th>
                  <th className="px-5 py-3 text-left">Rôle</th>
                  <th className="px-5 py-3 text-left">Statut</th>
                  <th className="px-5 py-3 text-left">Créé le</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.content.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-gray-400">
                      Aucun utilisateur trouvé.
                    </td>
                  </tr>
                ) : (
                  data.content.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 font-mono font-medium text-gray-700">{user.cin}</td>
                      <td className="px-5 py-3 text-gray-800">
                        {user.prenom} {user.nom}
                      </td>
                      <td className="px-5 py-3 text-gray-500">{user.email || '—'}</td>
                      <td className="px-5 py-3">
                        <Badge label={user.role} />
                      </td>
                      <td className="px-5 py-3">
                        <Badge
                          status={user.active ? 'active' : 'inactive'}
                          label={user.active ? 'Actif' : 'Inactif'}
                        />
                      </td>
                      <td className="px-5 py-3 text-gray-400">{formatDate(user.createdAt)}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link to={`/admin/users/${user.id}/edit`}>
                            <button className="p-1.5 text-gray-400 hover:text-ministere-600 hover:bg-ministere-50 rounded-lg transition-all">
                              <PencilIcon className="w-4 h-4" />
                            </button>
                          </Link>
                          <button
                            onClick={() => handleToggle(user)}
                            className={`p-1.5 rounded-lg transition-all text-xs font-medium px-2 py-1 ${
                              user.active
                                ? 'text-orange-600 hover:bg-orange-50'
                                : 'text-green-600 hover:bg-green-50'
                            }`}
                          >
                            {user.active ? 'Désactiver' : 'Activer'}
                          </button>
                          <button
                            onClick={() => handleResetPassword(user.id)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            title="Réinitialiser le mot de passe"
                          >
                            <KeyIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => confirmDelete(user)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {data.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 text-sm text-gray-500">
            <span>
              {data.totalElements} utilisateur{data.totalElements > 1 ? 's' : ''}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
              >
                ←
              </button>
              {Array.from({ length: data.totalPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i)}
                  className={`px-3 py-1 rounded border ${
                    i === page
                      ? 'bg-ministere-500 text-white border-ministere-500'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {i + 1}
                </button>
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

      {/* Delete confirmation modal */}
      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, user: null })}
        title="Confirmer la suppression"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteModal({ open: false, user: null })}>
              Annuler
            </Button>
            <Button variant="danger" loading={deleting} onClick={handleDelete}>
              Supprimer
            </Button>
          </>
        }
      >
        <p className="text-gray-600">
          Êtes-vous sûr de vouloir supprimer l'utilisateur{' '}
          <strong>{deleteModal.user?.prenom} {deleteModal.user?.nom}</strong> ?
          Cette action est irréversible.
        </p>
      </Modal>

      {/* Generated password modal */}
      <Modal
        isOpen={resetModal.open}
        onClose={() => setResetModal({ open: false, generatedPassword: null })}
        title="Mot de passe réinitialisé"
        footer={
          <>
            <Button onClick={copyToClipboard}>
              <ClipboardDocumentIcon className="w-4 h-4 mr-1.5" />
              Copier
            </Button>
            <Button
              variant="secondary"
              onClick={() => setResetModal({ open: false, generatedPassword: null })}
            >
              Fermer
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-amber-600 text-sm font-medium">
            ⚠️ Notez le nouveau mot de passe ci-dessous. Il ne sera plus affiché après fermeture.
          </p>
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
            <code className="flex-1 font-mono text-base text-gray-800 tracking-wider">
              {resetModal.generatedPassword}
            </code>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UsersListPage;
