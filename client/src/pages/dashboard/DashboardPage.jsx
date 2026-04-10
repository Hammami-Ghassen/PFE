import React from 'react';
import useAuth from '../../hooks/useAuth';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { 
  IdentificationIcon, 
  EnvelopeIcon, 
  ShieldCheckIcon, 
  BuildingOfficeIcon,
  MapPinIcon,
  BriefcaseIcon,
  AcademicCapIcon,
  ComputerDesktopIcon
} from '@heroicons/react/24/outline';

const DashboardPage = () => {
  const { auth } = useAuth();
  const displayName = auth.user?.fullName || [auth.user?.firstName, auth.user?.lastName].filter(Boolean).join(' ').trim() || auth.user?.matPers;
  
  // Get initials for the avatar
  const getInitials = () => {
    if (auth.user?.firstName && auth.user?.lastName) {
      return `${auth.user.firstName[0]}${auth.user.lastName[0]}`.toUpperCase();
    }
    if (displayName !== auth.user?.matPers) {
      return displayName.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Profile Header */}
      <Card className="bg-gradient-to-r from-ministere-50 to-white border-l-4 border-l-ministere-600">
        <div className="flex items-center gap-6">
          <div className="h-20 w-20 rounded-full bg-ministere-600 text-white flex items-center justify-center text-2xl font-bold shadow-md">
            {getInitials()}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
              {displayName}
              {auth.user?.role && <Badge label={auth.user.role} status={auth.user.role} />}
            </h2>
            <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
              <ShieldCheckIcon className="w-4 h-4" />
              Système OTP Ministère de la Santé
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="text-xl font-semibold text-gray-800 mb-6 border-b pb-2 flex items-center gap-2">
          <IdentificationIcon className="w-6 h-6 text-ministere-600" />
          Détails du profil
        </h3>
        
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-5">
          {/* Left Column (Account Info) */}
          <div className="flex flex-col sm:flex-row sm:items-start md:col-start-1 md:row-start-1">
            <dt className="text-base font-medium text-gray-500 w-[40%] flex items-start gap-2 pt-0.5">
              <IdentificationIcon className="w-5 h-5 flex-shrink-0" /> MAT_PERS
            </dt>
            <dd className="text-base text-gray-900 font-medium sm:w-[60%]">{auth.user?.matPers || '—'}</dd>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-start md:col-start-1 md:row-start-2">
            <dt className="text-base font-medium text-gray-500 w-[40%] flex items-start gap-2 pt-0.5">
              <EnvelopeIcon className="w-5 h-5 flex-shrink-0" /> Email
            </dt>
            <dd className="text-base text-gray-900 sm:w-[60%] break-all">{auth.user?.email || '—'}</dd>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-start md:col-start-1 md:row-start-3">
            <dt className="text-base font-medium text-gray-500 w-[40%] flex items-start gap-2 pt-0.5">
              <ShieldCheckIcon className="w-5 h-5 flex-shrink-0" /> Rôle
            </dt>
            <dd className="text-base text-gray-900 sm:w-[60%]">
              {auth.user?.role ? <Badge label={auth.user.role} status={auth.user.role} /> : '—'}
            </dd>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-start md:col-start-1 md:row-start-4">
            <dt className="text-base font-medium text-gray-500 w-[40%] flex items-start gap-2 pt-0.5">
              <BuildingOfficeIcon className="w-5 h-5 flex-shrink-0" /> Etablissement
            </dt>
            <dd className="text-base text-gray-900 sm:w-[60%]">{auth.user?.establishmentName || '—'}</dd>
          </div>

          {/* Right Column (Professional Info) */}
          <div className="flex flex-col sm:flex-row sm:items-start md:col-start-2 md:row-start-1">
            <dt className="text-base font-medium text-gray-500 w-[40%] flex items-start gap-2 pt-0.5">
              <MapPinIcon className="w-5 h-5 flex-shrink-0" /> Adresse
            </dt>
            <dd className="text-base text-gray-900 sm:w-[60%]">{auth.user?.adresse || '—'}</dd>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-start md:col-start-2 md:row-start-2">
            <dt className="text-base font-medium text-gray-500 w-[40%] flex items-start gap-2 pt-0.5">
              <BriefcaseIcon className="w-5 h-5 flex-shrink-0" /> Service
            </dt>
            <dd className="text-base text-gray-900 sm:w-[60%]">{auth.user?.service || '—'}</dd>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-start md:col-start-2 md:row-start-3">
            <dt className="text-base font-medium text-gray-500 w-[40%] flex items-start gap-2 pt-0.5">
              <AcademicCapIcon className="w-5 h-5 flex-shrink-0" /> Grade
            </dt>
            <dd className="text-base text-gray-900 sm:w-[60%]">{auth.user?.grade || '—'}</dd>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-start md:col-start-2 md:row-start-4">
            <dt className="text-base font-medium text-gray-500 w-[40%] flex items-start gap-2 pt-0.5">
              <ComputerDesktopIcon className="w-5 h-5 flex-shrink-0" /> Poste
            </dt>
            <dd className="text-base text-gray-900 sm:w-[60%]">{auth.user?.posteTravail || '—'}</dd>
          </div>
        </dl>
      </Card>
    </div>
  );
};

export default DashboardPage;
