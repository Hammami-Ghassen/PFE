import React from 'react';
import useAuth from '../../hooks/useAuth';
import Card from '../../components/ui/Card';

const DashboardPage = () => {
  const { auth } = useAuth();
  const displayName = auth.user?.fullName || [auth.user?.firstName, auth.user?.lastName].filter(Boolean).join(' ').trim() || auth.user?.matPers;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-800">
          Bienvenue,{' '}
          <span className="text-ministere-600">
            {displayName}
          </span>
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Mes Informations — Système OTP Ministère de la Santé
        </p>
      </div>

      <Card>
        <h3 className="text-base font-semibold text-gray-700 mb-2">
          Informations du compte
        </h3>
        <div className="text-sm text-gray-600 space-y-1">
          <p>
            <span className="font-medium">MAT_PERS :</span> {auth.user?.matPers}
          </p>
          <p>
            <span className="font-medium">Email :</span> {auth.user?.email || '—'}
          </p>
          <p>
            <span className="font-medium">Rôle :</span> {auth.user?.role || auth.user?.codUser}
          </p>
          <p>
            <span className="font-medium">Etablissement :</span> {auth.user?.establishmentName || '—'}
          </p>
        </div>
      </Card>
    </div>
  );
};

export default DashboardPage;
