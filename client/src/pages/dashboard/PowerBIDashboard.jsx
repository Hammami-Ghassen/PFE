import React from 'react';
import Card from '../../components/ui/Card';
import useAuth from '../../hooks/useAuth';

const ETABLISSEMENT_POWERBI_URL = process.env.REACT_APP_ETABLISSEMENT_POWERBI_URL || '';
const MINISTRE_POWERBI_URL = process.env.REACT_APP_MINISTRE_POWERBI_URL || '';

const withPowerBIFilter = (url, codSoc) => {
  if (!url || !codSoc) {
    return url;
  }

  const separator = url.includes('?') ? '&' : '?';
  const filter = `d_etablissement/code_etablissement eq '${codSoc}'`;
  const encodedFilter = encodeURIComponent(filter).replace(/'/g, '%27');

  return `${url}${separator}filter=${encodedFilter}`;
};

const PowerBIDashboard = () => {
  const { auth } = useAuth();
  const codSoc = auth.user?.codSoc ? String(auth.user.codSoc).trim() : '';
  const isMinistryDirector = codSoc === '0001';
  const powerbiUrl = isMinistryDirector
    ? MINISTRE_POWERBI_URL
    : withPowerBIFilter(ETABLISSEMENT_POWERBI_URL, codSoc);

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
