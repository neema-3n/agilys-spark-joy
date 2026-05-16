import React from 'react';
import { PageHeader } from '@/components/PageHeader';
import { PlanComptableManager } from '@/components/parametres/PlanComptableManager';

const PlanComptable = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Plan Comptable"
        description="Import et structuration hiérarchique du plan comptable"
      />
      
      <div>
        <PlanComptableManager />
      </div>
    </div>
  );
};

export default PlanComptable;
