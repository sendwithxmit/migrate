import type {
  ResourceType,
  ProviderCredentials,
  MigrateContact,
  MigrateList,
  MigrateTemplate,
  MigrateSuppression,
  MigrateCampaign,
  MigrateDomain,
  MigrateSender,
} from "../../types.js";
import { BaseProvider } from "../base.js";
import { ResendClient } from "./client.js";
import { mapContact, mapList, mapDomain, mapCampaign } from "./mappers.js";

export class ResendProvider extends BaseProvider {
  readonly name = "resend";
  readonly displayName = "Resend";
  readonly capabilities: Record<ResourceType, boolean> = {
    contacts: true,
    lists: true,
    templates: false,
    suppressions: false,
    campaigns: true,
    domains: true,
    senders: false,
  };

  private client: ResendClient;

  constructor(credentials: ProviderCredentials) {
    super(credentials, 2); // Resend: 2 req/s (free tier), 10 req/s (paid)
    this.client = new ResendClient(
      credentials.apiKey,
      (url, init) => this.fetchWithRetry(url, init),
    );
  }

  async validateCredentials(): Promise<boolean> {
    return this.client.validateApiKey();
  }

  async getCounts(
    resources: ResourceType[],
  ): Promise<Partial<Record<ResourceType, number>>> {
    const counts: Partial<Record<ResourceType, number>> = {};

    if (resources.includes("contacts") || resources.includes("lists")) {
      const audiences = await this.client.getAudiences();
      if (resources.includes("lists")) counts.lists = audiences.length;
      if (resources.includes("contacts")) {
        let total = 0;
        for (const aud of audiences) {
          const contacts = await this.client.getContacts(aud.id);
          total += contacts.length;
        }
        counts.contacts = total;
      }
    }
    if (resources.includes("campaigns")) {
      const broadcasts = await this.client.getBroadcasts();
      counts.campaigns = broadcasts.length;
    }

    return counts;
  }

  async *extractContacts(): AsyncGenerator<MigrateContact[]> {
    const audiences = await this.client.getAudiences();
    const seen = new Set<string>();

    for (const aud of audiences) {
      const contacts = await this.client.getContacts(aud.id);
      const batch: MigrateContact[] = [];

      for (const c of contacts) {
        if (c.unsubscribed || seen.has(c.email)) continue;
        seen.add(c.email);
        batch.push(mapContact(c));
      }

      if (batch.length > 0) yield batch;
    }
  }

  async *extractLists(): AsyncGenerator<MigrateList> {
    const audiences = await this.client.getAudiences();
    for (const aud of audiences) {
      yield mapList(aud);
    }
  }

  async *extractTemplates(): AsyncGenerator<MigrateTemplate> {
    // Resend templates are not available via API
  }

  async *extractSuppressions(): AsyncGenerator<MigrateSuppression[]> {
    // Resend suppressions are dashboard-only, not available via API
  }

  async *extractCampaigns(): AsyncGenerator<MigrateCampaign> {
    const broadcasts = await this.client.getBroadcasts();
    for (const b of broadcasts) {
      // List endpoint returns metadata only; fetch individual for HTML content
      const full = await this.client.getBroadcast(b.id);
      yield mapCampaign(full);
    }
  }

  async extractDomains(): Promise<MigrateDomain[]> {
    const domains = await this.client.getDomains();
    return domains.map(mapDomain);
  }

  async extractSenders(): Promise<MigrateSender[]> {
    // Resend doesn't track senders separately from domains
    return [];
  }
}
