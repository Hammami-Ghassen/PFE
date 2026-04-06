import React, { useEffect, useState } from 'react';
import useAuth from '../../hooks/useAuth';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import { getUserStats } from '../../services/userService';
import Card from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';
import { UsersIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { ROLES } from '../../utils/constants';

const StatCard = ({ label, value, icon: Icon, color }) => (
  <Card className="flex items-center gap-5">
    <div className={`p-3 rounded-xl ${color}`}>
      <Icon className="w-7 h-7 text-white" />
    </div>
    <div>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  </Card>
);

const DashboardPage = () => {
  const { auth } = useAuth();
  const axiosPrivate = useAxiosPrivate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  const isAdmin = auth.user?.role === ROLES.ADMIN;

  useEffect(() => {
    if (!isAdmin) return;
    setLoading(true);
    getUserStats(axiosPrivate)
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isAdmin]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-800">
          Bienvenue,{' '}
          <span className="text-ministere-600">
            {auth.user?.prenom} {auth.user?.nom}
          </span>
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Tableau de bord — Système de Gestion des Utilisateurs
        </p>
      </div>

      {isAdmin && (
        <>
          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : stats ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <StatCard
                label="Total Utilisateurs"
                value={stats.total}
                icon={UsersIcon}
                color="bg-ministere-500"
              />
              <StatCard
                label="Utilisateurs Actifs"
                value={stats.active}
                icon={CheckCircleIcon}
                color="bg-accent-green"
              />
              <StatCard
                label="Utilisateurs Inactifs"
                value={stats.inactive}
                icon={XCircleIcon}
                color="bg-accent-red"
              />
            </div>
          ) : null}
        </>
      )}

      <Card>
        <h3 className="text-base font-semibold text-gray-700 mb-2">
          Informations du compte
        </h3>
        <div className="text-sm text-gray-600 space-y-1">
          <p>
            <span className="font-medium">CIN :</span> {auth.user?.cin}
          </p>
          <p>
            <span className="font-medium">Email :</span>{' '}
            {auth.user?.email || '—'}
          </p>
          <p>
            <span className="font-medium">Rôle :</span> {auth.user?.role}
          </p>
        </div>
      </Card>
    </div>
  );
};

export default DashboardPage;
