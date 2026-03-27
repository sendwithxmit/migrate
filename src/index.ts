// Core
export { Migrator } from "./migrator.js";
export { TransmitClient } from "./client/transmit-client.js";
export { RateLimiter } from "./client/rate-limiter.js";

// Providers
export { getProvider, getProviderNames, registerProvider } from "./providers/registry.js";
export { BaseProvider } from "./providers/base.js";
export { SendGridProvider } from "./providers/sendgrid/index.js";
export { MailchimpProvider } from "./providers/mailchimp/index.js";
export { BrevoProvider } from "./providers/brevo/index.js";
export { ResendProvider } from "./providers/resend/index.js";

// Transformers
export { convertVariables } from "./transformers/variable-converter.js";

// Reporting
export { Reporter } from "./reporting/reporter.js";

// Types
export type {
  Provider,
  ProviderCredentials,
  MigrateConfig,
  MigrateContact,
  MigrateList,
  MigrateTemplate,
  MigrateSuppression,
  MigrateDomain,
  MigrateSender,
  MigrateCampaign,
  ResourceType,
  ImportableResource,
  IdMap,
  ResourceReport,
  MigrationReport,
} from "./types.js";
export { RESOURCE_TYPES, IMPORTABLE_RESOURCES } from "./types.js";
