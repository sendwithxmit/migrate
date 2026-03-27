// ── Normalized data types ──

export interface MigrateContact {
  email: string;
  firstName?: string;
  lastName?: string;
  metadata?: Record<string, unknown>;
  sourceId?: string;
}

export interface MigrateList {
  sourceId: string;
  name: string;
  description?: string;
  contactEmails?: string[];
}

export interface MigrateTemplate {
  sourceId: string;
  name: string;
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  variables?: string[];
}

export interface MigrateSuppression {
  email: string;
  reason: "unsubscribe" | "bounce" | "complaint" | "manual";
  source?: string;
}

export interface MigrateDomain {
  domain: string;
  sourceId?: string;
  verified?: boolean;
}

export interface MigrateSender {
  email: string;
  name?: string;
  replyTo?: string;
  domain?: string;
}

export interface MigrateCampaign {
  sourceId: string;
  name: string;
  subject: string;
  bodyHtml: string;
  senderEmail?: string;
  listSourceId?: string;
}

// ── Resource types ──

export const RESOURCE_TYPES = [
  "contacts",
  "lists",
  "templates",
  "suppressions",
  "campaigns",
  "domains",
  "senders",
] as const;

export type ResourceType = (typeof RESOURCE_TYPES)[number];

// Importable via API (not domains/senders)
export const IMPORTABLE_RESOURCES = [
  "lists",
  "contacts",
  "templates",
  "suppressions",
  "campaigns",
] as const;

export type ImportableResource = (typeof IMPORTABLE_RESOURCES)[number];

// ── Provider interface ──

export interface Provider {
  readonly name: string;
  readonly displayName: string;
  readonly capabilities: Record<ResourceType, boolean>;

  validateCredentials(): Promise<boolean>;
  getCounts(
    resources: ResourceType[]
  ): Promise<Partial<Record<ResourceType, number>>>;

  extractContacts(): AsyncGenerator<MigrateContact[]>;
  extractLists(): AsyncGenerator<MigrateList>;
  extractTemplates(): AsyncGenerator<MigrateTemplate>;
  extractSuppressions(): AsyncGenerator<MigrateSuppression[]>;
  extractCampaigns(): AsyncGenerator<MigrateCampaign>;

  extractDomains(): Promise<MigrateDomain[]>;
  extractSenders(): Promise<MigrateSender[]>;
}

// ── Configuration ──

export interface MigrateConfig {
  provider: string;
  providerApiKey: string;
  transmitApiKey: string;
  transmitUrl?: string;
  resources: ImportableResource[];
  dryRun?: boolean;
  batchSize?: number;
  verbose?: boolean;
}

// ── Provider credentials ──

export interface ProviderCredentials {
  apiKey: string;
  /** Mailchimp datacenter extracted from API key suffix */
  datacenter?: string;
}

// ── ID mapping ──

export type IdMap = Map<string, string>;

// ── Report types ──

export interface ResourceReport {
  resource: ResourceType;
  total: number;
  created: number;
  skipped: number;
  errors: number;
  errorDetails: Array<{ item: string; error: string }>;
}

export interface MigrationReport {
  provider: string;
  startedAt: Date;
  completedAt: Date;
  dryRun: boolean;
  resources: ResourceReport[];
  domains: MigrateDomain[];
  senders: MigrateSender[];
}
