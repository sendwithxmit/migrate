# @xmit/migrate

Migrate your email data from any ESP to [Transmit](https://xmit.sh). Supports contacts, lists, templates, suppressions, and campaigns.

## Supported Providers

| Provider | Contacts | Lists | Templates | Suppressions | Campaigns | Guide |
|----------|----------|-------|-----------|--------------|-----------|-------|
| SendGrid | Yes | Yes | Yes | Yes | Yes | [docs/sendgrid.md](docs/sendgrid.md) |
| Mailchimp | Yes | Yes | Yes | Yes | Yes | [docs/mailchimp.md](docs/mailchimp.md) |
| Brevo | Yes | Yes | Yes | Yes | Yes | [docs/brevo.md](docs/brevo.md) |
| Resend | Yes | Yes | No | No | Yes | [docs/resend.md](docs/resend.md) |

Each provider guide covers API key setup, what gets migrated, variable conversion details, known limitations, and the exact API endpoints used.

## Quick Start

```bash
npx @xmit/migrate
```

The interactive CLI will guide you through:

1. Selecting your source provider
2. Entering your provider API key
3. Entering your Transmit API key
4. Choosing which data to migrate
5. Running a dry-run preview
6. Executing the migration

## Non-Interactive Mode

```bash
npx @xmit/migrate \
  --provider sendgrid \
  --api-key SG.xxxxx \
  --transmit-key pm_live_xxxxx \
  --resources contacts,lists,templates,suppressions \
  --no-interactive
```

### CLI Options

| Flag | Description |
|------|-------------|
| `--provider <name>` | Source provider: `sendgrid`, `mailchimp`, `brevo`, `resend` |
| `--api-key <key>` | Source provider API key |
| `--transmit-key <key>` | Transmit API key (starts with `pm_live_`) |
| `--transmit-url <url>` | Custom Transmit API URL |
| `--resources <list>` | Comma-separated: `contacts,lists,templates,suppressions,campaigns` |
| `--dry-run` | Preview without making changes |
| `--batch-size <n>` | Contacts per import batch (default: 500) |
| `--no-interactive` | Skip all prompts |
| `--verbose` | Detailed output |

## Library Usage

```typescript
import { Migrator, getProvider } from "@xmit/migrate";

const provider = getProvider("sendgrid", { apiKey: "SG.xxxxx" });
const migrator = new Migrator(provider, {
  provider: "sendgrid",
  providerApiKey: "SG.xxxxx",
  transmitApiKey: "pm_live_xxxxx",
  resources: ["contacts", "lists", "templates"],
  dryRun: false,
});

const report = await migrator.run();
console.log(report);
```

### Custom Providers

```typescript
import { BaseProvider, registerProvider } from "@xmit/migrate";

class MyProvider extends BaseProvider {
  readonly name = "my-provider";
  readonly displayName = "My Provider";
  readonly capabilities = {
    contacts: true,
    lists: true,
    templates: false,
    suppressions: false,
    campaigns: false,
    domains: false,
    senders: false,
  };

  // Implement extract methods...
}

registerProvider("my-provider", MyProvider);
```

## What Gets Migrated

### Imported Automatically
- **Lists**: Created in Transmit, ID mapping maintained for contact assignment
- **Contacts**: Imported with first name, last name, and custom metadata
- **Templates**: HTML content with variable syntax automatically converted
- **Suppressions**: Bounces, complaints, and unsubscribes preserved for deliverability
- **Campaigns**: Imported as drafts

### Reported Only (Manual Setup Required)
- **Domains**: Listed with verification status. Add them in the Transmit dashboard and update DNS.
- **Senders**: Listed with display names. Create them in Transmit after domain setup.

## Variable Conversion

Template variables are automatically converted to Transmit's `{{variable}}` format:

| Provider | Source | Converted |
|----------|--------|-----------|
| SendGrid | `{{{first_name}}}` | `{{firstName}}` |
| Mailchimp | `*\|FNAME\|*` | `{{firstName}}` |
| Brevo | `{{ contact.FIRSTNAME }}` | `{{firstName}}` |
| Resend | `{{firstName}}` | `{{firstName}}` |

## Provider Notes

### SendGrid
Contact export uses an async job. The tool polls until the export is ready, which may take a few seconds for large lists.

### Mailchimp
Contacts are scoped per audience. The tool iterates all audiences and deduplicates contacts across them. Your API key must include the datacenter suffix (e.g., `abc123-us21`).

### Brevo
A/B test campaigns import the winner variant (or variant A if no winner).

### Resend
Suppressions are not available via API (dashboard-only). Templates are not currently exported via API.

## Development

```bash
pnpm install
pnpm build
pnpm test
node dist/cli.js --help
```

## License

MIT
