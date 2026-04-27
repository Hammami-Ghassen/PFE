import React from 'react';
import { UserCircleIcon, ArrowPathIcon, PencilSquareIcon } from '@heroicons/react/24/solid';

const ProfileHeader = ({ user, onResetPassword, onEditProfile }) => {
  const displayName = user?.fullName || [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || user?.matPers;
  const roleName = user?.role || 'Utilisateur';
  const establishment = user?.establishmentName || 'Établissement inconnu';

  return (
    <div className="bg-accent-red relative rounded-xl shadow-lg p-6 sm:p-8 flex flex-col md:flex-row items-center md:items-start gap-6 md:justify-between text-white overflow-hidden">
      {/* Background Graphic */}
      <div className="absolute top-0 right-0 h-full w-full opacity-20 bg-gradient-to-l from-black/40 via-transparent to-transparent pointer-events-none"></div>

      <div className="flex flex-col md:flex-row items-center md:items-start gap-6 relative z-10 w-full">
        {/* Avatar */}
        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl bg-white/10 flex items-center justify-center p-2 shadow-inner border border-white/20">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt="Profil" className="w-full h-full object-cover rounded-lg shadow-sm" />
          ) : (
            <UserCircleIcon className="w-full h-full text-white/80" />
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col flex-1 items-center md:items-start text-center md:text-left">
          <h2 className="text-3xl font-bold tracking-tight mb-1">{displayName}</h2>
          <p className="text-red-100 text-lg font-medium mb-3">{roleName}, {establishment}</p>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/20 text-green-50 text-xs font-semibold uppercase tracking-wider backdrop-blur-sm border border-green-400/30">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span> Statut actif
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 relative z-10 shrink-0 w-full sm:w-auto">
        <button
          onClick={onResetPassword}
          className="flex-1 sm:flex-none justify-center inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-transparent text-white border border-white/30 hover:bg-white/10 hover:border-white focus:outline-none focus:ring-2 focus:ring-white/50 transition-all font-medium whitespace-nowrap"
        >
          <ArrowPathIcon className="w-4 h-4" />
          RÉINITIALISER LE MOT DE PASSE
        </button>
        <button
          onClick={onEditProfile}
          className="flex-1 sm:flex-none justify-center inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-white text-accent-red hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-200 transition-all font-bold shadow-md whitespace-nowrap"
        >
          <PencilSquareIcon className="w-4 h-4" />
          MODIFIER LE PROFIL
        </button>
      </div>
    </div>
  );
};

export default ProfileHeader;