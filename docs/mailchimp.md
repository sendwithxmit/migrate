# Migrating from Mailchimp

## Prerequisites

- A Mailchimp API key (includes datacenter suffix, e.g., `abc123def-us21`)
- A Transmit API key (starts with `pm_live_`)

## Quick Start

```bash
npx @xmit/migrate --provider mailchimp --api-key abc123def-us21 --transmit-key pm_live_xxxxx
```

## What Gets Migrated

| Resource | Supported | Notes |
|----------|-----------|-------|
| Contacts | Yes | Deduplicated across all audiences |
| Lists | Yes | Audiences imported as lists |
| Templates | Yes | User-created templates with HTML content |
| Suppressions | Yes | Unsubscribed and cleaned members |
| Campaigns | Yes | Regular campaigns with full HTML content |
| Domains | Report only | Verified domains listed |
| Senders | Report only | Extracted from campaign `reply_to` fields |

## API Key Format

Mailchimp API keys contain the datacenter suffix after a hyphen. For example, in `abc123def456-us21`, the datacenter is `us21`. The tool extracts this automatically to construct the correct API base URL (`https://us21.api.mailchimp.com/3.0`).

## Contact Deduplication

Mailchimp contacts are scoped per audience (list). If a contact exists in multiple audiences, the tool deduplicates by email address, keeping the first occurrence. This prevents duplicate imports into Transmit.

## Suppression Mapping

Suppressions are extracted from member status within each audience:

| Mailchimp Status | Transmit Reason |
|------------------|-----------------|
| `unsubscribed` | `unsubscribe` |
| `cleaned` | `bounce` |

Suppressions are also deduplicated across audiences.

## Template Variables (Merge Tags)

Mailchimp uses `*|TAG|*` merge tag syntax. The tool converts these automatically:

| Mailchimp | Transmit |
|-----------|----------|
| `*\|FNAME\|*` | `{{firstName}}` |
| `*\|LNAME\|*` | `{{lastName}}` |
| `*\|EMAIL\|*` | `{{email}}` |
| `*\|UNSUB\|*` | `{{unsubscribe_url}}` |
| `*\|CUSTOM\|*` | `{{custom}}` |

Custom merge tags are lowercased.

## Rate Limiting

Mailchimp enforces a limit of 10 concurrent connections. The tool uses a rate limiter set to 10 requests per second to stay within this boundary. For very large audiences, the migration may take several minutes due to pagination (1000 members per page).

## Limitations

- **Automations**: Classic automations (workflow steps) are readable but not migrated. Customer Journeys are not accessible via API.
- **Segments**: Mailchimp segments and tags are not migrated.
- **Template subjects**: Mailchimp templates don't have an associated subject line, so the `subject` field will be empty for migrated templates.
- **Merge field definitions**: Only the merge field values in contacts are migrated, not the field definitions themselves.
- **Archive/sent campaigns**: All campaigns are imported as drafts in Transmit regardless of their original status.

## API Endpoints Used

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/3.0/` | Credential validation |
| GET | `/3.0/lists` | List all audiences |
| GET | `/3.0/lists/{id}/members` | Get members in an audience |
| GET | `/3.0/templates?type=user` | List user-created templates |
| GET | `/3.0/templates/{id}/default-content` | Get template HTML |
| GET | `/3.0/campaigns` | List all campaigns |
| GET | `/3.0/campaigns/{id}/content` | Get campaign HTML |
| GET | `/3.0/verified-domains` | List verified domains |

## Programmatic Usage

```typescript
import { MailchimpProvider } from "@xmit/migrate";

const provider = new MailchimpProvider({
  apiKey: "abc123def-us21",
  datacenter: "us21",
});

const valid = await provider.validateCredentials();

// Extract and count contacts across audiences
let total = 0;
for await (const batch of provider.extractContacts()) {
  total += batch.length;
}
console.log(`Total unique contacts: ${total}`);
```
