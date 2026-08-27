import { type Feature } from '@/data/features';

export function exportToCSV(features: Feature[], filename: string) {
  const headers = [
    'Jira Key', 'Title', 'Status', 'Pillar', 'Product Component',
    'PM Owner', 'Eng Owner', 'Eng Team', 'Releases', 'Customers',
    'Priority', 'Effort', 'At Risk', 'Summary', 'Customer Problem', 'Business Value',
  ];

  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;

  const rows = features.map(f => [
    f.jiraKey, f.title, f.status, f.pillar, f.productComponent,
    f.pmOwner, f.engOwner, f.engTeam,
    f.releases.join('; '), f.customers.join('; '),
    `P${f.priority}`, f.effort, f.atRisk ? 'Yes' : 'No',
    f.summary, f.customerProblem, f.businessValue,
  ].map(v => esc(String(v ?? ''))));

  const csv = [headers.map(esc), ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
