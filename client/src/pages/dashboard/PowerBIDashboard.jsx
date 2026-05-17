import React from 'react';
import Card from '../../components/ui/Card';
import useAuth from '../../hooks/useAuth';

const POWERBI_URL = process.env.REACT_APP_POWERBI_URL || '';

const PowerBIDashboard = () => {
  const { auth } = useAuth();
  const codSoc = auth.user?.codSoc;
  const powerbiUrl = codSoc
    ? `${POWERBI_URL}${POWERBI_URL.includes('?') ? '&' : '?'}filter=${encodeURIComponent(
        `public d_societe/code_societe eq '${codSoc}'`
      )}`
    : POWERBI_URL;

  return (
    <Card className="flex flex-col h-[calc(100vh-7rem)] overflow-hidden" padding={false}>
      <iframe
        title="tp"
        className="w-full h-full flex-1"
        src={powerbiUrl}
        allowFullScreen
      ></iframe>
    </Card>
  );
};

export default PowerBIDashboard;
