import axios from 'axios';
import { config } from '../config.js';

const jira = axios.create({
  baseURL: `${config.jiraBaseUrl}/rest/api/2`,
  headers: {
    Authorization: `Bearer ${config.jiraPat}`,
    'Content-Type': 'application/json',
  },
});

// Maps Jira status names to our internal Status type
function mapStatus(jiraStatus: string): string {
  const s = jiraStatus.toLowerCase();
  if (s.includes('done') || s.includes('delivered') || s.includes('closed') || s.includes('resolved')) return 'delivered';
  if (s.includes('deferred') || s.includes('won\'t do') || s.includes('backlog')) return 'deferred';
  if (s.includes('review') || s.includes('validation') || s.includes('testing')) return 'validation';
  if (s.includes('progress') || s.includes('dev') || s.includes('development')) return 'indev';
  if (s.includes('committed') || s.includes('selected') || s.includes('planned')) return 'committed';
  return 'concept';
}

function mapPriority(jiraPriority: string): number {
  const map: Record<string, number> = { Highest: 1, High: 2, Medium: 3, Low: 4, Lowest: 5 };
  return map[jiraPriority] ?? 3;
}

function mapPrdStatus(val: string | undefined): string {
  if (!val) return 'none';
  const v = val.toLowerCase();
  if (v.includes('approved')) return 'approved';
  if (v.includes('revision') || v.includes('change')) return 'needs_revision';
  if (v.includes('review')) return 'in_review';
  if (v.includes('draft')) return 'draft';
  return 'none';
}

// "6.8.1" → "6.8", "7.0.1" → "7.0" (matches the RELEASES array in the frontend)
function normalizeVersion(name: string): string {
  const m = /^(\d+\.\d+)/.exec(name);
  return m ? m[1] : name;
}

const COMPONENT_TO_PILLAR: Record<string, string> = {
  'Hardware': 'Next Gen Platforms & Compliance',
  'Licensing': 'Next Gen Platforms & Compliance',
  'Routing': 'Scalable Networking',
  'VPN': 'Scalable Networking',
  'High Availability': 'Scalable Networking',
  'SASE': 'On-Box Security & SASE',
  'Branch Security': 'On-Box Security & SASE',
  'Cloudblades': 'AI/Agentic Experience & Operations',
  'Controller': 'AI/Agentic Experience & Operations',
  'Supportability': 'AI/Agentic Experience & Operations',
  'UI': 'AI/Agentic Experience & Operations',
  'Agentic Network Operations': 'AI/Agentic Experience & Operations',
};

function issueToFeature(issue: Record<string, unknown>): Record<string, unknown> {
  const f = issue.fields as Record<string, unknown>;
  const cf = config.jiraFields;

  const fixVersions = (f.fixVersions as { name: string }[] | undefined) ?? [];
  const priority = (f.priority as { name: string } | undefined)?.name ?? 'Medium';
  const assignee = (f.assignee as { displayName: string } | undefined);
  const status = (f.status as { name: string } | undefined)?.name ?? '';
  const labels = (f.labels as string[] | undefined) ?? [];

  // Parse sdwan-X.X.X-cc labels as release identifiers
  const labelReleasePattern = /^sdwan-(\d+\.\d+(?:\.\d+)*)-cc$/;
  const labelReleases = labels
    .map(l => labelReleasePattern.exec(l)?.[1])
    .filter((v): v is string => !!v);
  const summary = (f.summary as string) ?? '';
  const description = (f.description as string | undefined) ?? '';

  // Derive component and pillar from Jira's standard Components field
  const jiraComponents = (f.components as { name: string }[] | undefined) ?? [];
  const productComponent = jiraComponents[0]?.name ?? '';
  const engOwnerRaw = (f[cf.engOwner] as { value?: string; displayName?: string } | string | undefined);
  const engTeamRaw = (f[cf.engTeam] as { value?: string } | string | undefined);
  const customerProblem = (f[cf.customerProblem] as string | undefined) ?? '';
  const businessValue = (f[cf.businessValue] as string | undefined) ?? '';
  const useCase = (f[cf.useCase] as string | undefined) ?? '';
  const customersRaw = (f[cf.customers] as string[] | undefined) ?? [];
  const prdStatusRaw = (f[cf.prdStatus] as { value?: string } | string | undefined);
  const effortRaw = (f[cf.effort] as { value?: string } | string | undefined);
  const requirementsUrl = (f[cf.requirements] as string | undefined) ?? '';
  const publicDocsUrl = (f[cf.publicDocsUrl] as string | undefined) ?? '';
  const prdReviewedRaw = (f[cf.prdReviewed] as Array<{ value: string } | string> | undefined) ?? [];
  const prdReviewed = prdReviewedRaw
    .map(v => (typeof v === 'string' ? v : (v.value ?? '')))
    .filter(Boolean);
  const figmaUrl = (f[cf.figmaLink] as string | undefined) ?? '';
  const testPlanUrl = (f[cf.testPlan] as string | undefined) ?? '';
  const functionalSpecUrl = (f[cf.functionalSpec] as string | undefined) ?? '';
  const uxStatusRaw = (f[cf.uxStatus] as { value?: string } | string | undefined);

  const getStr = (v: { value?: string } | string | undefined): string =>
    v ? (typeof v === 'string' ? v : (v.value ?? '')) : '';

  // Merge fixVersion names (normalized to X.Y) and label-derived releases; deduplicate
  const allReleases = [...new Set([
    ...fixVersions.map(v => normalizeVersion(v.name)),
    ...labelReleases,
  ])];

  // If eng has committed a fix version and issue isn't already active/done, mark as EC
  const mappedStatus = mapStatus(status);
  const derivedStatus = fixVersions.length > 0 && (mappedStatus === 'concept' || mappedStatus === 'committed')
    ? 'ec'
    : mappedStatus;

  const issuetype = (f.issuetype as { name?: string } | undefined)?.name ?? '';

  return {
    id: issue.key,
    jiraKey: issue.key,
    issuetype,
    title: summary,
    summary: description,
    customerProblem,
    businessValue,
    useCase,
    pillar: COMPONENT_TO_PILLAR[productComponent] ?? 'AI/Agentic Experience & Operations',
    productComponent: productComponent || 'Cloudblades',
    components: jiraComponents.map(c => c.name),
    status: derivedStatus,
    releases: allReleases,
    pmOwner: assignee?.displayName ?? 'Unassigned',
    engOwner: getStr(engOwnerRaw),
    engTeam: getStr(engTeamRaw),
    customers: customersRaw,
    labels,
    prdStatus: mapPrdStatus(getStr(prdStatusRaw)),
    prdReviewed,
    requirementsUrl: requirementsUrl || undefined,
    publicDocsUrl: publicDocsUrl || undefined,
    figmaUrl: figmaUrl || undefined,
    testPlanUrl: testPlanUrl || undefined,
    functionalSpecUrl: functionalSpecUrl || undefined,
    uxStatus: getStr(uxStatusRaw) || undefined,
    atRisk: labels.includes('at-risk') || labels.includes('risk'),
    riskReason: undefined,
    priority: mapPriority(priority),
    effort: (getStr(effortRaw) as 'S' | 'M' | 'L' | 'XL') || 'M',
  };
}

export async function getBacklogFeatures(): Promise<Record<string, unknown>[]> {
  const jql = `project = ${config.jiraProject} AND fixVersion is EMPTY ORDER BY priority ASC`;
  const cf = config.jiraFields;
  const customFields = Object.values(cf).filter(Boolean).join(',');
  const fields = `summary,description,status,priority,assignee,fixVersions,labels,components,${customFields}`;

  let startAt = 0;
  const maxResults = 100;
  const all: Record<string, unknown>[] = [];

  while (true) {
    const res = await jira.get('/search', {
      params: { jql, fields, maxResults, startAt },
    });
    const { issues, total } = res.data as { issues: Record<string, unknown>[]; total: number };
    const items = issues
      .map(issueToFeature)
      .filter(f => !(f.labels as string[]).some(l => l.toLowerCase().includes('cc')));
    all.push(...items);
    startAt += issues.length;
    if (startAt >= total) break;
  }

  return all;
}

export async function getFeatures(release?: string, label?: string): Promise<Record<string, unknown>[]> {
  let jql: string;
  if (label) {
    jql = `project = ${config.jiraProject} AND labels = "${label}" ORDER BY priority ASC`;
  } else if (release) {
    jql = `project = ${config.jiraProject} AND fixVersion in ("${release}") ORDER BY priority ASC`;
  } else {
    jql = `project = ${config.jiraProject} AND status != Done ORDER BY priority ASC`;
  }

  const cf = config.jiraFields;
  const customFields = Object.values(cf).filter(Boolean).join(',');
  const fields = `summary,description,status,priority,assignee,fixVersions,labels,components,${customFields}`;

  let startAt = 0;
  const maxResults = 100;
  const all: Record<string, unknown>[] = [];

  while (true) {
    const res = await jira.get('/search', {
      params: { jql, fields, maxResults, startAt },
    });
    const { issues, total } = res.data as { issues: Record<string, unknown>[]; total: number };
    all.push(...issues.map(issueToFeature).filter(f => (f.releases as string[]).length > 0 || !!label));
    startAt += issues.length;
    if (startAt >= total) break;
  }

  return all;
}

export async function getFeature(key: string): Promise<Record<string, unknown>> {
  const cf = config.jiraFields;
  const customFields = Object.values(cf).filter(Boolean).join(',');
  const fields = `summary,description,status,priority,assignee,fixVersions,labels,components,issuetype,${customFields}`;
  const res = await jira.get(`/issue/${key}`, { params: { fields } });
  const feature = issueToFeature(res.data as Record<string, unknown>);
  // Expose raw issuetype so callers can inspect it
  const f = (res.data as Record<string, unknown>).fields as Record<string, unknown>;
  (feature as Record<string, unknown>).issuetype = (f.issuetype as { name?: string })?.name;
  return feature;
}

export async function updateFeature(key: string, body: Record<string, unknown>): Promise<void> {
  await jira.put(`/issue/${key}`, { fields: body });
}

export async function getJiraFields(): Promise<unknown[]> {
  const res = await jira.get('/field');
  return res.data as unknown[];
}

export async function getIssueTypes(): Promise<{ id: string; name: string; subtask: boolean }[]> {
  const res = await jira.get('/issue/createmeta', {
    params: { projectKeys: config.jiraProject, expand: 'projects.issuetypes' },
  });
  const data = res.data as { projects?: { issuetypes?: { id: string; name: string; subtask: boolean }[] }[] };
  return data.projects?.[0]?.issuetypes ?? [];
}

// Maps the display release (e.g. "7.1") to the Jira fixVersion name
const RELEASE_TO_VERSION: Record<string, string> = {
  '6.8': '6.8.1',
  '7.0': '7.0.1',
  '7.1': '7.1.1',
};

export async function getComponents(): Promise<{ id: string; name: string }[]> {
  const res = await jira.get(`/project/${config.jiraProject}/components`);
  return (res.data as { id: string; name: string }[]).sort((a, b) => a.name.localeCompare(b.name));
}

export async function createFeature(body: {
  summary: string;
  reporter?: string;
  components?: string[];
  description?: string;
  priority?: string;
  labels?: string[];
  prdReviewed?: string[];
  uxReview?: boolean;
  prdLink?: string;
  testPlanLink?: string;
  figmaLink?: string;
  functionalSpecLink?: string;
}): Promise<{ key: string; url: string }> {
  const cf = config.jiraFields;

  const fields: Record<string, unknown> = {
    project:   { key: config.jiraProject },
    issuetype: { name: 'New Feature' },
    summary:   body.summary,
  };

  if (body.reporter)              fields.reporter         = { name: body.reporter };
  if (body.components?.length)    fields.components       = body.components.map(name => ({ name }));
  if (body.description)           fields.description      = body.description;
  if (body.priority)              fields.priority         = { name: body.priority };
  if (body.labels?.length)        fields.labels           = body.labels;
  if (body.prdReviewed?.length && cf.prdReviewed)
    fields[cf.prdReviewed]  = body.prdReviewed.map(v => ({ value: v }));
  if (body.uxReview && cf.uxStatus)
    fields[cf.uxStatus]     = { value: 'Yes' };
  if (body.prdLink && cf.requirements)
    fields[cf.requirements] = body.prdLink;
  if (body.testPlanLink && cf.testPlan)
    fields[cf.testPlan]     = body.testPlanLink;
  if (body.figmaLink && cf.figmaLink)
    fields[cf.figmaLink]    = body.figmaLink;
  if (body.functionalSpecLink && cf.functionalSpec)
    fields[cf.functionalSpec] = body.functionalSpecLink;

  const res = await jira.post('/issue', { fields });
  const data = res.data as { key: string };
  return {
    key: data.key,
    url: `${config.jiraBaseUrl}/browse/${data.key}`,
  };
}

// Returns Jira keys in ranked order from the sdwan-7.1.1-cc Kanban board (ID 6528).
export async function getKanbanOrder(): Promise<string[]> {
  const agile = axios.create({
    baseURL: `${config.jiraBaseUrl}/rest/agile/1.0`,
    headers: { Authorization: `Bearer ${config.jiraPat}`, 'Content-Type': 'application/json' },
  });
  const keys: string[] = [];
  let startAt = 0;
  const maxResults = 100;
  while (true) {
    const res = await agile.get('/board/6528/issue', {
      params: { startAt, maxResults, fields: 'summary', jql: 'ORDER BY rank ASC' },
    });
    const data = res.data as { issues?: { key: string }[]; total?: number };
    const issues = data.issues ?? [];
    keys.push(...issues.map(i => i.key));
    if (keys.length >= (data.total ?? 0) || issues.length < maxResults) break;
    startAt += maxResults;
  }
  return keys;
}
