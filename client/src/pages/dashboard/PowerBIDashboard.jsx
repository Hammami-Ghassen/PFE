import React from 'react';
import Card from '../../components/ui/Card';

const PowerBIDashboard = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-800">Tableau de bord</h2>
        <p className="text-sm text-gray-500 mt-1">
          Espace reserve au reporting decisionnel (PowerBI).
        </p>
      </div>
      <Card>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Intégration PowerBI à venir...</p>
        </div>
      </Card>
    </div>
  );
};

export default PowerBIDashboard;
