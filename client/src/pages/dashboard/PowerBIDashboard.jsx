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
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-gray-700">Integration PowerBI</h3>
          <p className="text-sm text-gray-500">
            Le rapport PowerBI sera integre ici via iframe/embed une fois les informations de publication
            (URL, workspace, securite d'acces) finalisees.
          </p>
          <div className="w-full h-[480px] rounded-lg border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center">
            <span className="text-sm text-gray-400">Placeholder iframe PowerBI</span>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default PowerBIDashboard;
