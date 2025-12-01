import { LigneBudgetaire, Section, Programme, Action } from '@/types/budget.types';
import { Compte } from '@/types/compte.types';
import { Enveloppe } from '@/types/enveloppe.types';

interface ExportContext {
  sections: Section[];
  programmes: Programme[];
  actions: Action[];
  comptes: Compte[];
  enveloppes: Enveloppe[];
}

const formatMontant = (montant: number) => {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(montant);
};

const getSectionCode = (actionId: string, context: ExportContext) => {
  const action = context.actions.find(a => a.id === actionId);
  const programme = context.programmes.find(p => p.id === action?.programme_id);
  const section = context.sections.find(s => s.id === programme?.section_id);
  return section?.code || '';
};

const getProgrammeCode = (actionId: string, context: ExportContext) => {
  const action = context.actions.find(a => a.id === actionId);
  const programme = context.programmes.find(p => p.id === action?.programme_id);
  return programme?.code || '';
};

const getActionCode = (actionId: string, context: ExportContext) => {
  const action = context.actions.find(a => a.id === actionId);
  return action?.code || '';
};

const getCompteNumero = (compteId: string, context: ExportContext) => {
  const compte = context.comptes.find(c => c.id === compteId);
  return compte?.numero || '';
};

const getEnveloppeCode = (enveloppeId: string | undefined, context: ExportContext) => {
  if (!enveloppeId) return '';
  const enveloppe = context.enveloppes.find(e => e.id === enveloppeId);
  return enveloppe?.code || '';
};

export function exportBudgetToCSV(
  lignes: LigneBudgetaire[],
  context: ExportContext,
  filename: string = 'budget.csv'
) {
  const headers = [
    'Section',
    'Programme',
    'Action',
    'Compte',
    'Enveloppe',
    'Libellé',
    'Montant Initial',
    'Montant Modifié',
    'Réservé',
    'Engagé',
    'Liquidé',
    'Payé',
    'Disponible',
    'Taux Exécution',
    'Statut',
  ];

  const rows = lignes.map(ligne => {
    const tauxExecution = ligne.montantModifie === 0 
      ? 0 
      : Math.round((ligne.montantEngage / ligne.montantModifie) * 100);

    return [
      getSectionCode(ligne.actionId, context),
      getProgrammeCode(ligne.actionId, context),
      getActionCode(ligne.actionId, context),
      getCompteNumero(ligne.compteId, context),
      getEnveloppeCode(ligne.enveloppeId, context),
      ligne.libelle,
      ligne.montantInitial,
      ligne.montantModifie,
      ligne.montantReserve || 0,
      ligne.montantEngage,
      ligne.montantLiquide,
      ligne.montantPaye,
      ligne.disponible,
      `${tauxExecution}%`,
      ligne.statut,
    ];
  });

  const csv = [
    headers.join(';'),
    ...rows.map(row => row.join(';'))
  ].join('\n');

  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function printBudgetResults(
  lignes: LigneBudgetaire[],
  context: ExportContext,
  title: string = 'Plan Budgétaire',
  totals?: {
    montantInitial: number;
    montantModifie: number;
    montantReserve: number;
    montantEngage: number;
    montantLiquide: number;
    montantPaye: number;
    disponible: number;
  }
) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Impossible d\'ouvrir la fenêtre d\'impression');
  }

  const rows = lignes.map(ligne => {
    const tauxExecution = ligne.montantModifie === 0 
      ? 0 
      : Math.round((ligne.montantEngage / ligne.montantModifie) * 100);

    return `
      <tr>
        <td>${getSectionCode(ligne.actionId, context)}</td>
        <td>${getProgrammeCode(ligne.actionId, context)}</td>
        <td>${getActionCode(ligne.actionId, context)}</td>
        <td>${getCompteNumero(ligne.compteId, context)}</td>
        <td>${getEnveloppeCode(ligne.enveloppeId, context)}</td>
        <td>${ligne.libelle}</td>
        <td class="text-right">${formatMontant(ligne.montantInitial)}</td>
        <td class="text-right font-bold">${formatMontant(ligne.montantModifie)}</td>
        <td class="text-right">${formatMontant(ligne.montantReserve || 0)}</td>
        <td class="text-right">${formatMontant(ligne.montantEngage)}</td>
        <td class="text-right">${formatMontant(ligne.montantLiquide)}</td>
        <td class="text-right">${formatMontant(ligne.montantPaye)}</td>
        <td class="text-right font-bold">${formatMontant(ligne.disponible)}</td>
        <td class="text-center">${tauxExecution}%</td>
        <td>${ligne.statut}</td>
      </tr>
    `;
  }).join('');

  const totalsRow = totals ? `
    <tr class="font-bold bg-gray-100">
      <td colspan="6" class="text-right">TOTAUX</td>
      <td class="text-right">${formatMontant(totals.montantInitial)}</td>
      <td class="text-right">${formatMontant(totals.montantModifie)}</td>
      <td class="text-right">${formatMontant(totals.montantReserve)}</td>
      <td class="text-right">${formatMontant(totals.montantEngage)}</td>
      <td class="text-right">${formatMontant(totals.montantLiquide)}</td>
      <td class="text-right">${formatMontant(totals.montantPaye)}</td>
      <td class="text-right">${formatMontant(totals.disponible)}</td>
      <td colspan="2"></td>
    </tr>
  ` : '';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          @media print {
            @page { size: landscape; margin: 1cm; }
            body { margin: 0; }
          }
          body {
            font-family: Arial, sans-serif;
            font-size: 10px;
            line-height: 1.4;
          }
          h1 {
            font-size: 18px;
            margin-bottom: 10px;
            text-align: center;
          }
          .meta {
            text-align: center;
            margin-bottom: 20px;
            color: #666;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 6px 8px;
            text-align: left;
          }
          th {
            background-color: #f5f5f5;
            font-weight: bold;
          }
          .text-right {
            text-align: right;
          }
          .text-center {
            text-align: center;
          }
          .font-bold {
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <div class="meta">
          Imprimé le ${new Date().toLocaleDateString('fr-FR')} - ${lignes.length} ligne(s)
        </div>
        <table>
          <thead>
            <tr>
              <th>Section</th>
              <th>Prog.</th>
              <th>Action</th>
              <th>Compte</th>
              <th>Env.</th>
              <th>Libellé</th>
              <th class="text-right">Initial</th>
              <th class="text-right">Modifié</th>
              <th class="text-right">Réservé</th>
              <th class="text-right">Engagé</th>
              <th class="text-right">Liquidé</th>
              <th class="text-right">Payé</th>
              <th class="text-right">Disponible</th>
              <th class="text-center">Taux</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
            ${totalsRow}
          </tbody>
        </table>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  
  setTimeout(() => {
    printWindow.print();
  }, 250);
}

export function exportBudgetToPDF(
  lignes: LigneBudgetaire[],
  context: ExportContext,
  filename: string = 'budget.pdf'
) {
  // Pour l'instant, utiliser l'impression avec save as PDF
  // Dans une future version, intégrer jspdf + jspdf-autotable
  printBudgetResults(lignes, context, 'Plan Budgétaire');
}
