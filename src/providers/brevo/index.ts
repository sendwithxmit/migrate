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
import { BrevoClient } from "./client.js";
import {
  mapContact,
  mapList,
  mapTemplate,
  mapSuppression,
  mapDomain,
  mapSender,
  mapCampaign,
} from "./mappers.js";

export class BrevoProvider extends BaseProvider {
  readonly name = "brevo";
  readonly displayName = "Brevo";
  readonly capabilities: Record<ResourceType, boolean> = {
    contacts: true,
    lists: true,
    templates: true,
    suppressions: true,
    campaigns: true,
    domains: true,
    senders: true,
  };

  private client: BrevoClient;

  constructor(credentials: ProviderCredentials) {
    super(credentials, 10);
    this.client = new BrevoClient(
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

    if (resources.includes("contacts")) {
      const data = await this.client.getContacts(1, 0);
      counts.contacts = data.count;
    }
    if (resources.includes("lists")) {
      const data = await this.client.getLists(1, 0);
      counts.lists = data.count;
    }
    if (resources.includes("templates")) {
      const data = await this.client.getTemplates(1, 0);
      counts.templates = data.count;
    }
    if (resources.includes("suppressions")) {
      const data = await this.client.getBlockedContacts(1, 0);
      counts.suppressions = data.count;
    }
    if (resources.includes("campaigns")) {
      const data = await this.client.getCampaigns(1, 0);
      counts.campaigns = data.count;
    }

    return counts;
  }

  async *extractContacts(): AsyncGenerator<MigrateContact[]> {
    let offset = 0;
    while (true) {
      const data = await this.client.getContacts(50, offset);
      if (!data.contacts || data.contacts.length === 0) break;

      yield data.contacts.map(mapContact);
      offset += data.contacts.length;
      if (offset >= data.count) break;
    }
  }

  async *extractLists(): AsyncGenerator<MigrateList> {
    let offset = 0;
    while (true) {
      const data = await this.client.getLists(50, offset);
      if (!data.lists || data.lists.length === 0) break;

      for (const list of data.lists) {
        yield mapList(list);
      }
      offset += data.lists.length;
      if (offset >= data.count) break;
    }
  }

  async *extractTemplates(): AsyncGenerator<MigrateTemplate> {
    let offset = 0;
    while (true) {
      const data = await this.client.getTemplates(50, offset);
      if (!data.templates || data.templates.length === 0) break;

      for (const t of data.templates) {
        yield mapTemplate(t);
      }
      offset += data.templates.length;
      if (offset >= data.count) break;
    }
  }

  async *extractSuppressions(): AsyncGenerator<MigrateSuppression[]> {
    let offset = 0;
    while (true) {
      const data = await this.client.getBlockedContacts(50, offset);
      if (!data.contacts || data.contacts.length === 0) break;

      yield data.contacts.map(mapSuppression);
      offset += data.contacts.length;
      if (offset >= data.count) break;
    }
  }

  async *extractCampaigns(): AsyncGenerator<MigrateCampaign> {
    let offset = 0;
    while (true) {
      const data = await this.client.getCampaigns(50, offset);
      if (!data.campaigns || data.campaigns.length === 0) break;

      for (const c of data.campaigns) {
        // List endpoint may omit htmlContent; fetch individual for full content
        const full = c.htmlContent ? c : await this.client.getCampaign(c.id);
        yield mapCampaign(full);
      }
      offset += data.campaigns.length;
      if (offset >= data.count) break;
    }
  }

  async extractDomains(): Promise<MigrateDomain[]> {
    const domains = await this.client.getDomains();
    return domains.map(mapDomain);
  }

  async extractSenders(): Promise<MigrateSender[]> {
    const senders = await this.client.getSenders();
    return senders.map(mapSender);
  }
}
