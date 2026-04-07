import React from 'react';
import Input from '../ui/Input';
import Button from '../ui/Button';

const LoginOtpStep = ({ otp, onOtpChange, onBack }) => (
  <>
    <Input
      id="otp"
      label="Code OTP (6 chiffres)"
      type="text"
      placeholder="Ex: 123456"
      maxLength={6}
      value={otp}
      onChange={onOtpChange}
      required
    />
    <Button type="button" variant="secondary" className="w-full" onClick={onBack}>
      Retour
    </Button>
  </>
);

export default LoginOtpStep;
