import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatMontant } from '@/lib/utils';
import type { ReportColumnDefinition, ReportRow } from '@/types/reporting';

const formatValue = (value: string | number | null | undefined, kind?: ReportColumnDefinition['kind']) => {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'number') {
    if (kind === 'currency') return formatMontant(value);
    if (kind === 'percent') return `${value.toFixed(1)} %`;
    if (kind === 'number') return value.toLocaleString('fr-FR');
  }
  return String(value);
};

export const exportReportToPdf = ({
  title,
  subtitle,
  columns,
  rows,
  filename,
}: {
  title: string;
  subtitle?: string;
  columns: ReportColumnDefinition[];
  rows: ReportRow[];
  filename: string;
}) => {
  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFontSize(16);
  doc.text(title, 14, 18);
  if (subtitle) {
    doc.setFontSize(9);
    doc.setTextColor(90);
    doc.text(subtitle, 14, 25);
  }

  autoTable(doc, {
    head: [columns.map((column) => column.label)],
    body: rows.map((row) =>
      columns.map((column) => formatValue(row.cells[column.id], column.kind)),
    ),
    startY: subtitle ? 30 : 24,
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
    },
    headStyles: {
      fillColor: [230, 238, 250],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
    },
  });

  doc.save(filename);
};

export const exportReportToXls = ({
  title,
  columns,
  rows,
  filename,
}: {
  title: string;
  columns: ReportColumnDefinition[];
  rows: ReportRow[];
  filename: string;
}) => {
  const tableRows = rows
    .map((row) => {
      const cells = columns
        .map((column) => `<td>${formatValue(row.cells[column.id], column.kind)}</td>`)
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');

  const html = `
    <html>
      <head>
        <meta charset="utf-8" />
      </head>
      <body>
        <table border="1">
          <caption style="font-weight:bold;text-align:left;margin-bottom:8px;">${title}</caption>
          <thead>
            <tr>${columns.map((column) => `<th>${column.label}</th>`).join('')}</tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </body>
    </html>
  `;

  const blob = new Blob([html], {
    type: 'application/vnd.ms-excel;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
