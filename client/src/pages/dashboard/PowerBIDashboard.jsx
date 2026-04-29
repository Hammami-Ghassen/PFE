import React from 'react';
import Card from '../../components/ui/Card';
POWERBI_URL=process.env.POWERBI_URL

const PowerBIDashboard = () => {
  return (
    <Card className="flex flex-col h-[calc(100vh-7rem)] overflow-hidden" padding={false}>
      <iframe 
        title="tp" 
        className="w-full h-full flex-1"
        src= {POWERBI_URL}
        allowFullScreen
      ></iframe>
    </Card>
  );
};

export default PowerBIDashboard;
