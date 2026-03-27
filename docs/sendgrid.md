# Migrating from SendGrid

## Prerequisites

- A SendGrid API key with **Full Access** or at minimum these scopes:
  - `marketing.read` (contacts, lists, single sends)
  - `templates.read`
  - `suppression.read`
  - `sender_verification.read`
  - `whitelabel.read`
- A Transmit API key (starts with `pm_live_`)

## Quick Start

```bash
npx @xmit/migrate --provider sendgrid --api-key SG.xxxxx --transmit-key pm_live_xxxxx
```

## What Gets Migrated

| Resource | Supported | Notes |
|----------|-----------|-------|
| Contacts | Yes | Async export job (may take a few seconds for large lists) |
| Lists | Yes | Marketing lists with names |
| Templates | Yes | Dynamic templates with active version. Variables auto-converted. |
| Suppressions | Yes | Bounces, blocks, invalid emails, spam reports, unsubscribes |
| Campaigns | Yes | Single sends imported as drafts |
| Domains | Report only | Whitelabel domains listed with verification status |
| Senders | Report only | Verified senders listed with display names |

## Contact Export

SendGrid's contact export is asynchronous. The tool:

1. Initiates an export job via `POST /marketing/contacts/exports`
2. Polls the job status with exponential backoff (2s, 4s, 8s, up to 30s)
3. Downloads the NDJSON result once ready
4. Streams contacts in batches of 500

For large accounts (100k+ contacts), the export job may take 30-60 seconds to complete.

## Suppression Mapping

SendGrid has 5 separate suppression endpoints, which are consolidated into Transmit's unified suppression model:

| SendGrid Endpoint | Transmit Reason |
|-------------------|-----------------|
| `/suppression/bounces` | `bounce` |
| `/suppression/blocks` | `bounce` |
| `/suppression/invalid_emails` | `bounce` |
| `/suppression/spam_reports` | `complaint` |
| `/suppression/unsubscribes` | `unsubscribe` |

## Template Variables

SendGrid uses Handlebars syntax. The tool converts these automatically:

| SendGrid | Transmit |
|----------|----------|
| `{{first_name}}` | `{{firstName}}` |
| `{{{first_name}}}` (unescaped) | `{{firstName}}` |
| `{{email}}` | `{{email}}` |
| `{{custom_field}}` | `{{custom_field}}` |

Triple-brace (unescaped) variables are converted to double-brace. Standard field names are normalized (`first_name` to `firstName`, `last_name` to `lastName`, etc.).

## Limitations

- **Designs**: SendGrid's drag-and-drop designs (GET `/designs`) are separate from dynamic templates. Only dynamic templates are migrated.
- **Legacy campaigns**: Only single sends (new marketing campaigns) are migrated, not the legacy campaigns API.
- **Contact custom fields**: Custom field values are preserved in `metadata`, but the custom field definitions themselves are not created in Transmit.
- **Segments**: SendGrid segments are not migrated. Contacts are exported as a flat set.

## API Endpoints Used

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/v3/scopes` | Credential validation |
| POST | `/v3/marketing/contacts/exports` | Start contact export |
| GET | `/v3/marketing/contacts/exports/{id}` | Poll export status |
| GET | `/v3/marketing/contacts/count` | Contact count |
| GET | `/v3/marketing/lists` | List all marketing lists |
| GET | `/v3/templates?generations=dynamic` | List dynamic templates |
| GET | `/v3/templates/{id}` | Get template with versions |
| GET | `/v3/suppression/{type}` | Get suppressions (5 types) |
| GET | `/v3/marketing/singlesends` | List single sends |
| GET | `/v3/whitelabel/domains` | List authenticated domains |
| GET | `/v3/verified_senders` | List verified senders |

## Programmatic Usage

```typescript
import { SendGridProvider } from "@xmit/migrate";

const provider = new SendGridProvider({ apiKey: "SG.xxxxx" });
const valid = await provider.validateCredentials();

// Extract contacts manually
for await (const batch of provider.extractContacts()) {
  console.log(`Got ${batch.length} contacts`);
}
```
