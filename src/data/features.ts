export type Status = 'concept' | 'committed' | 'ec' | 'indev' | 'validation' | 'delivered' | 'deferred';

export type PrdStatus = 'none' | 'draft' | 'in_review' | 'approved' | 'needs_revision';

export const PRD_STATUS_CONFIG: Record<PrdStatus, { label: string; color: string; bg: string }> = {
  none:           { label: 'No PRD',          color: '#64748b', bg: 'rgba(100,116,139,0.10)' },
  draft:          { label: 'Draft',           color: '#4f8ef7', bg: 'rgba(79,142,247,0.10)'  },
  in_review:      { label: 'In Review',       color: '#f59e0b', bg: 'rgba(245,158,11,0.10)'  },
  approved:       { label: 'Approved',        color: '#00c896', bg: 'rgba(0,200,150,0.10)'   },
  needs_revision: { label: 'Needs Revision',  color: '#f43f5e', bg: 'rgba(244,63,94,0.10)'   },
};

export type Pillar =
  | 'Next Gen Platforms & Compliance'
  | 'Scalable Networking'
  | 'On-Box Security & SASE'
  | 'AI/Agentic Experience & Operations';

export type ProductComponent =
  | 'Hardware'
  | 'Licensing'
  | 'Routing'
  | 'VPN'
  | 'High Availability'
  | 'SASE'
  | 'Branch Security'
  | 'Cloudblades'
  | 'Controller'
  | 'Supportability'
  | 'UI'
  | 'Agentic Network Operations';

export const PILLAR_COMPONENTS: Record<Pillar, ProductComponent[]> = {
  'Next Gen Platforms & Compliance': ['Hardware', 'Licensing'],
  'Scalable Networking': ['Routing', 'VPN', 'High Availability'],
  'On-Box Security & SASE': ['SASE', 'Branch Security'],
  'AI/Agentic Experience & Operations': ['Cloudblades', 'Controller', 'Supportability', 'UI', 'Agentic Network Operations'],
};

export const COMPONENT_PILLAR: Record<ProductComponent, Pillar> = {
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

export interface Customer {
  name: string;
  tier: 'Enterprise' | 'Strategic' | 'Growth';
  segment: string;
}

export interface Feature {
  id: string;
  jiraKey: string;
  title: string;
  summary: string;
  businessValue: string;
  pillar: Pillar;
  productComponent: ProductComponent;
  status: Status;
  releases: string[];          // can span multiple releases
  pmOwner: string;
  engOwner: string;
  engTeam: string;
  customerProblem: string;
  useCase: string;
  customers: string[];
  labels: string[];
  components: string[];         // all Jira components (multi-value)
  confluencePRD?: string;
  requirementsUrl?: string;
  publicDocsUrl?: string;
  figmaUrl?: string;
  testPlanUrl?: string;
  functionalSpecUrl?: string;
  uxStatus?: string;
  prdReviewed: string[];        // e.g. ['QA Reviewed', 'Dev Reviewed']
  atRisk: boolean;
  riskReason?: string;
  prdStatus: PrdStatus;
  priority: number;            // 1=highest
  effort: 'S' | 'M' | 'L' | 'XL';
}

export const CUSTOMERS: Customer[] = [];

export const FEATURES: Feature[] = [];

export const RELEASES = ['6.5', '6.6', '6.8', '7.0', '7.1'];

export const RELEASE_NOTES_URLS: Record<string, string> = {
  '6.8': 'https://docs.paloaltonetworks.com/prisma-sd-wan/release-notes/6-8/prisma-sd-wan-ion-device-release-6-8/features-introduced-in-prisma-sd-wan-ion-release-6-8',
};

export const PM_OWNERS: string[] = [];
export const ENG_TEAMS: string[] = [];
export const PILLARS: Pillar[] = ['AI/Agentic Experience & Operations', 'Scalable Networking', 'On-Box Security & SASE', 'Next Gen Platforms & Compliance'];
export const PRODUCT_COMPONENTS: ProductComponent[] = ['Cloudblades', 'Controller', 'Supportability', 'UI', 'Agentic Network Operations', 'Routing', 'VPN', 'High Availability', 'SASE', 'Branch Security', 'Hardware', 'Licensing'];

export const STATUS_LABELS: Record<Status, string> = {
  concept: 'Concept', committed: 'Committed', ec: 'Eng. Committed', indev: 'In Development',
  validation: 'Validation', delivered: 'Delivered', deferred: 'Deferred',
};

export const STATUS_ORDER: Status[] = ['concept', 'committed', 'ec', 'indev', 'validation', 'delivered', 'deferred'];

export function statusColor(s: Status) {
  return { concept: '#94a3b8', committed: '#4f8ef7', ec: '#22d3ee', indev: '#a78bfa', validation: '#f59e0b', delivered: '#00c896', deferred: '#f43f5e' }[s];
}

export function pillarColor(p: Pillar) {
  return {
    'AI/Agentic Experience & Operations': '#4f8ef7',
    'Scalable Networking': '#2dd4bf',
    'On-Box Security & SASE': '#a78bfa',
    'Next Gen Platforms & Compliance': '#fb923c',
  }[p];
}
