# Migrating from Brevo

## Prerequisites

- A Brevo API key (from Settings > SMTP & API > API Keys)
- A Transmit API key (starts with `pm_live_`)

## Quick Start

```bash
npx @xmit/migrate --provider brevo --api-key xkeysib-xxxxx --transmit-key pm_live_xxxxx
```

## What Gets Migrated

| Resource | Supported | Notes |
|----------|-----------|-------|
| Contacts | Yes | All contacts with FIRSTNAME, LASTNAME, and custom attributes |
| Lists | Yes | Contact lists with names |
| Templates | Yes | SMTP templates with subject and HTML content |
| Suppressions | Yes | Blocked contacts with reason codes |
| Campaigns | Yes | Email campaigns with full HTML (individual fetch for complete content) |
| Domains | Report only | Authenticated domains listed |
| Senders | Report only | Configured senders listed with names |

## Contact Attributes

Brevo stores contact data in an `attributes` object. Built-in attributes are mapped to standard fields:

| Brevo Attribute | Transmit Field |
|-----------------|----------------|
| `FIRSTNAME` | `firstName` |
| `LASTNAME` | `lastName` |
| All other attributes | `metadata` (preserved as-is) |

Attribute values can be strings, numbers, booleans, or dates. All custom attributes are preserved in the contact's `metadata` field.

## Suppression Mapping

Brevo uses specific reason codes for blocked contacts. The tool maps these to Transmit's suppression model:

| Brevo Reason Code | Transmit Reason |
|-------------------|-----------------|
| `hardBounce` | `bounce` |
| `softBounce` | `bounce` |
| `unsubscribed` | `unsubscribe` |
| `unsubscribedViaMA` | `unsubscribe` |
| `unsubscribedViaEmail` | `unsubscribe` |
| `adminBlocked` | `manual` |
| `contactBlocked` | `manual` |
| Unknown codes | `manual` (safe fallback) |

## Template Variables

Brevo uses two variable syntaxes. Both are converted automatically:

| Brevo | Transmit |
|-------|----------|
| `{{ contact.FIRSTNAME }}` | `{{firstName}}` |
| `{{ contact.LASTNAME }}` | `{{lastName}}` |
| `{{ params.ORDER_ID }}` | `{{order_id}}` |
| `{{ contact.CUSTOM }}` | `{{custom}}` |

The `contact.` and `params.` prefixes are stripped, and standard field names are normalized.

## Campaign A/B Tests

For A/B test campaigns, the tool imports the campaign as returned by the API (typically the winner variant or the primary variant). Only one variant per campaign is imported.

## Pagination

Brevo's API has a maximum page size of 50 for most endpoints. The tool automatically handles pagination for contacts, lists, templates, campaigns, and blocked contacts.

## Limitations

- **Transactional email logs**: Individual transactional email history is not migrated.
- **Automation workflows**: Brevo automation scenarios are not migrated.
- **Folders**: List and template folder organization is not preserved.
- **Contact scoring**: Lead scoring data is not migrated.

## API Endpoints Used

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/v3/account` | Credential validation |
| GET | `/v3/contacts` | List contacts (paginated, limit 50) |
| GET | `/v3/contacts/lists` | List contact lists |
| GET | `/v3/smtp/templates` | List SMTP templates |
| GET | `/v3/emailCampaigns` | List email campaigns |
| GET | `/v3/emailCampaigns/{id}` | Get campaign detail with full HTML |
| GET | `/v3/smtp/blockedContacts` | List blocked contacts |
| GET | `/v3/senders/domains` | List authenticated domains |
| GET | `/v3/senders` | List configured senders |

## Programmatic Usage

```typescript
import { BrevoProvider } from "@xmit/migrate";

const provider = new BrevoProvider({ apiKey: "xkeysib-xxxxx" });
const valid = await provider.validateCredentials();

// Get counts before migrating
const counts = await provider.getCounts([
  "contacts",
  "lists",
  "templates",
  "suppressions",
]);
console.log(counts);
```
