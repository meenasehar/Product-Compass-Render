import { BAKED_ENV } from './baked-env.js';

// Priority: runtime env var (Render/shell) → baked-in value → default
function get(name: string, fallback = ''): string {
  return process.env[name] ?? BAKED_ENV[name] ?? fallback;
}

export const config = {
  port: parseInt(get('PORT', '3001'), 10),
  nodeEnv: get('NODE_ENV', 'development'),
  allowedOrigins: get('ALLOWED_ORIGINS', 'http://localhost:5173').split(',').map(s => s.trim()),

  // Auth
  googleClientId: get('GOOGLE_CLIENT_ID'),
  googleClientSecret: get('GOOGLE_CLIENT_SECRET'),
  googleRedirectUri: get('GOOGLE_REDIRECT_URI', 'http://localhost:3001/auth/callback'),
  jwtSecret: get('JWT_SECRET', 'dev-secret-change-in-production'),
  allowedDomain: get('ALLOWED_DOMAIN', 'paloaltonetworks.com'),

  // Jira DC
  jiraBaseUrl: get('JIRA_BASE_URL', 'https://jira-dc.paloaltonetworks.com'),
  jiraPat: get('JIRA_PAT'),
  jiraProject: get('JIRA_PROJECT', 'PSDWPM'),

  // Confluence DC
  confluenceBaseUrl: get('CONFLUENCE_BASE_URL', 'https://confluence.paloaltonetworks.com'),
  confluencePat: get('CONFLUENCE_PAT'),

  // Google Drive
  googleServiceAccountJson: get('GOOGLE_SERVICE_ACCOUNT_JSON'),
  gdriveFolderId: get('GDRIVE_FOLDER_ID'),

  // Google quota project for ADC requests
  googleQuotaProject: get('GOOGLE_QUOTA_PROJECT', 'google-mpf-pm05ow6g0l2l'),

  // Public URL of this server (used to construct proxy URLs for Google Slides API)
  serverPublicUrl: get('SERVER_PUBLIC_URL', ''),

  // Anthropic
  anthropicApiKey: get('ANTHROPIC_API_KEY'),
  anthropicBaseUrl: get('ANTHROPIC_BASE_URL', 'https://api.anthropic.com'),

  // Custom Jira field IDs — populate after running GET /rest/api/2/field
  jiraFields: {
    pillar:           get('JIRA_FIELD_PILLAR',            ''),
    productComponent: get('JIRA_FIELD_PRODUCT_COMPONENT', ''),
    engOwner:         get('JIRA_FIELD_ENG_OWNER',         ''),
    engTeam:          get('JIRA_FIELD_ENG_TEAM',          ''),
    customerProblem:  get('JIRA_FIELD_CUSTOMER_PROBLEM',  ''),
    businessValue:    get('JIRA_FIELD_BUSINESS_VALUE',    ''),
    useCase:          get('JIRA_FIELD_USE_CASE',          ''),
    customers:        get('JIRA_FIELD_CUSTOMERS',         ''),
    prdStatus:        get('JIRA_FIELD_PRD_STATUS',        ''),
    effort:           get('JIRA_FIELD_EFFORT',            ''),
    requirements:     get('JIRA_FIELD_REQUIREMENTS',      'customfield_18880'),
    prdReviewed:      get('JIRA_FIELD_PRD_REVIEWED',      'customfield_18862'),
    figmaLink:        get('JIRA_FIELD_FIGMA_LINK',        'customfield_28616'),
    testPlan:         get('JIRA_FIELD_TEST_PLAN',         'customfield_18882'),
    functionalSpec:   get('JIRA_FIELD_FUNCTIONAL_SPEC',   'customfield_18881'),
    uxStatus:         get('JIRA_FIELD_UX_STATUS',         'customfield_18992'),
    publicDocsUrl:    get('JIRA_FIELD_PUBLIC_DOCS_URL',   ''),
  },
};
