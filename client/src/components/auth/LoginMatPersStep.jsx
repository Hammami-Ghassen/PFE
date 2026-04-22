import React from 'react';
import Input from '../ui/Input';
import { UserIcon, DevicePhoneMobileIcon, EnvelopeIcon } from '@heroicons/react/24/outline';

const LoginMatPersStep = ({ matPers, channel, onMatPersChange, onChannelChange }) => (
  <div className="space-y-4">
    <Input
      id="matPers"
      type="text"
      placeholder="Identifiant MAT_PERS"
      maxLength={8}
      value={matPers}
      onChange={onMatPersChange}
      icon={UserIcon}
      required
    />
    <div className="relative flex items-center">
      <div className="absolute left-3 text-gray-400">
        {channel === 'EMAIL' ? <EnvelopeIcon className="w-5 h-5" /> : <DevicePhoneMobileIcon className="w-5 h-5" />}
      </div>
      <select
        id="channel"
        value={channel}
        onChange={onChannelChange}
        className="w-full pl-10 px-4 py-3 border border-gray-200 bg-gray-50 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-ministere-500 appearance-none"
      >
        <option value="EMAIL">Recevoir OTP par Email</option>
        <option value="SMS">Recevoir OTP par SMS</option>
      </select>
    </div>
  </div>
);

export default LoginMatPersStep;
