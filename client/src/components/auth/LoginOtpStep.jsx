import React from 'react';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { LockClosedIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

const LoginOtpStep = ({ otp, onOtpChange, onBack, onResend, resendTimer }) => (
  <div className="space-y-4">
    <Input
      id="otp"
      type="password"
      placeholder="Code OTP (6 chiffres)"
      maxLength={6}
      value={otp}
      onChange={onOtpChange}
      icon={LockClosedIcon}
      required
    />
    
    <div className="flex items-center justify-between text-sm mt-4 mb-2">
      <div className="flex items-center space-x-2">
        <input type="checkbox" id="remember" className="rounded text-ministere-600 focus:ring-ministere-500 border-gray-300" />
        <label htmlFor="remember" className="text-gray-500">Se souvenir de moi</label>
      </div>
      <div>
        <button
          type="button"
          onClick={onResend}
          disabled={resendTimer > 0}
          className={`font-semibold transition-colors flex items-center gap-1 ${
            resendTimer > 0 ? 'text-gray-400 cursor-not-allowed' : 'text-red-600 hover:text-red-700'
          }`}
        >
          {resendTimer > 0 ? (
             `Renvoyer OTP (${resendTimer}s)`
          ) : (
             <>
               <ArrowPathIcon className="w-4 h-4" />
               Renvoyer OTP
             </>
          )}
        </button>
      </div>
    </div>
    <div className="pt-2">
      <Button type="button" variant="ghost" className="w-full text-gray-500" onClick={onBack}>
        Changer le MAT_PERS
      </Button>
    </div>
  </div>
);

export default LoginOtpStep;
