import React from 'react';
import Card from '../../components/ui/Card';

const PowerBIDashboard = () => {
  return (
    <Card className="flex flex-col h-[calc(100vh-7rem)] overflow-hidden" padding={false}>
      <iframe 
        title="tp" 
        className="w-full h-full flex-1"
        src="https://app.powerbi.com/view?r=eyJrIjoiYzNjNzhjOGEtNjJkMi00YWNlLThmYjMtNzYzYjE1MGE5MWVkIiwidCI6ImRiZDY2NjRkLTRlYjktNDZlYi05OWQ4LTVjNDNiYTE1M2M2MSIsImMiOjl9"  
        allowFullScreen
      ></iframe>
    </Card>
  );
};

export default PowerBIDashboard;
