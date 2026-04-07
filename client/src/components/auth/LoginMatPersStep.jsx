import React from 'react';
import Input from '../ui/Input';

const LoginMatPersStep = ({ matPers, channel, onMatPersChange, onChannelChange }) => (
  <>
    <Input
      id="matPers"
      label="Identifiant MAT_PERS"
      type="text"
      placeholder="Ex: 00091651"
      maxLength={8}
      value={matPers}
      onChange={onMatPersChange}
      required
    />
    <div className="flex flex-col gap-1">
      <label htmlFor="channel" className="text-sm font-medium text-gray-700">
        Canal OTP
      </label>
      <select
        id="channel"
        value={channel}
        onChange={onChannelChange}
        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ministere-500"
      >
        <option value="EMAIL">Email</option>
        <option value="SMS">SMS</option>
      </select>
    </div>
  </>
);

export default LoginMatPersStep;
