# Migrating from Resend

## Prerequisites

- A Resend API key (from the Resend dashboard)
- A Transmit API key (starts with `pm_live_`)

## Quick Start

```bash
npx @xmit/migrate --provider resend --api-key re_xxxxx --transmit-key pm_live_xxxxx
```

## What Gets Migrated

| Resource | Supported | Notes |
|----------|-----------|-------|
| Contacts | Yes | From all audiences, deduplicated by email |
| Lists | Yes | Audiences imported as lists |
| Templates | No | Not available via Resend API |
| Suppressions | No | Dashboard-only in Resend, no API access |
| Campaigns | Yes | Broadcasts with full HTML (fetched individually) |
| Domains | Report only | Listed with verification status |
| Senders | No | Resend manages senders via domains |

## Contact Handling

Resend contacts are scoped per audience. The tool:

1. Fetches all audiences via `GET /audiences`
2. For each audience, fetches all contacts via `GET /audiences/{id}/contacts`
3. Deduplicates across audiences by email address
4. Skips unsubscribed contacts (`unsubscribed: true`)

## Broadcast (Campaign) Import

Broadcasts are imported as draft campaigns in Transmit. The list endpoint (`GET /broadcasts`) returns metadata only, so the tool fetches each broadcast individually via `GET /broadcasts/{id}` to retrieve the full HTML content.

## Template Variables

Resend already uses `{{variable}}` syntax, which is compatible with Transmit. The tool only normalizes standard field names:

| Resend | Transmit |
|--------|----------|
| `{{first_name}}` | `{{firstName}}` |
| `{{last_name}}` | `{{lastName}}` |
| `{{email}}` | `{{email}}` |
| `{{customField}}` | `{{customField}}` (unchanged) |

## Rate Limiting

Resend has the strictest rate limits of the supported providers:

| Plan | Rate Limit |
|------|------------|
| Free | 2 requests/second |
| Paid | 10 requests/second |

The tool defaults to 2 requests/second for safety (compatible with all plans). This means migrations from Resend will be slower than other providers.

## Suppressions Note

Resend manages suppressions through its dashboard only. There is no API endpoint to export suppressions. After migrating, you should:

1. Review your suppression list in the Resend dashboard
2. Manually add critical suppressions (known bounces, complaints) to Transmit
3. Transmit will build its own suppression list as you send

## Limitations

- **Templates**: Resend templates are not accessible via the public API. They must be recreated manually in Transmit.
- **Suppressions**: Not available via API. Must be managed manually after migration.
- **Senders**: Resend ties senders to domains rather than tracking them separately. Domain information is reported for manual setup.
- **Rate limits**: The conservative 2 req/s default means large migrations are slower. Paid users can increase this programmatically.
- **Email history**: Individual email send history is not migrated.

## API Endpoints Used

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/domains` | Credential validation + domain list |
| GET | `/audiences` | List all audiences |
| GET | `/audiences/{id}/contacts` | List contacts in an audience |
| GET | `/broadcasts` | List all broadcasts (metadata) |
| GET | `/broadcasts/{id}` | Get broadcast with full HTML |

## Programmatic Usage

```typescript
import { ResendProvider } from "@xmit/migrate";

const provider = new ResendProvider({ apiKey: "re_xxxxx" });
const valid = await provider.validateCredentials();

// Check what's available
const counts = await provider.getCounts(["contacts", "lists", "campaigns"]);
console.log(counts);
// Note: templates and suppressions will not be in counts (capabilities = false)
```
