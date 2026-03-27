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
import { MailchimpClient } from "./client.js";
import {
  mapContact,
  mapList,
  mapTemplate,
  mapSuppression,
  mapDomain,
  mapCampaign,
} from "./mappers.js";

export class MailchimpProvider extends BaseProvider {
  readonly name = "mailchimp";
  readonly displayName = "Mailchimp";
  readonly capabilities: Record<ResourceType, boolean> = {
    contacts: true,
    lists: true,
    templates: true,
    suppressions: true,
    campaigns: true,
    domains: true,
    senders: true,
  };

  private client: MailchimpClient;

  constructor(credentials: ProviderCredentials) {
    super(credentials, 10);
    this.client = new MailchimpClient(
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
    const lists = await this.client.getLists();

    if (resources.includes("lists")) {
      counts.lists = lists.total_items;
    }
    if (resources.includes("contacts")) {
      let total = 0;
      for (const list of lists.lists) {
        total += list.stats.member_count;
      }
      counts.contacts = total;
    }
    if (resources.includes("templates")) {
      const data = await this.client.getTemplates();
      counts.templates = data.total_items;
    }
    if (resources.includes("suppressions")) {
      let total = 0;
      for (const list of lists.lists) {
        total += list.stats.unsubscribe_count + list.stats.cleaned_count;
      }
      counts.suppressions = total;
    }
    if (resources.includes("campaigns")) {
      const data = await this.client.getCampaigns();
      counts.campaigns = data.total_items;
    }

    return counts;
  }

  async *extractContacts(): AsyncGenerator<MigrateContact[]> {
    const seen = new Set<string>();
    const lists = await this.client.getLists();

    for (const list of lists.lists) {
      let offset = 0;
      while (true) {
        const data = await this.client.getMembers(
          list.id,
          offset,
          1000,
          "subscribed",
        );
        if (data.members.length === 0) break;

        const batch: MigrateContact[] = [];
        for (const member of data.members) {
          if (seen.has(member.email_address)) continue;
          seen.add(member.email_address);
          batch.push(mapContact(member));
        }

        if (batch.length > 0) yield batch;
        offset += data.members.length;
        if (offset >= data.total_items) break;
      }
    }
  }

  async *extractLists(): AsyncGenerator<MigrateList> {
    const data = await this.client.getLists();
    for (const list of data.lists) {
      yield mapList(list);
    }
  }

  async *extractTemplates(): AsyncGenerator<MigrateTemplate> {
    let offset = 0;
    while (true) {
      const data = await this.client.getTemplates(offset);
      if (data.templates.length === 0) break;

      for (const t of data.templates) {
        try {
          const content = await this.client.getTemplateContent(t.id);
          yield mapTemplate(t, content.html);
        } catch {
          // Skip templates we can't fetch content for
        }
      }

      offset += data.templates.length;
      if (offset >= data.total_items) break;
    }
  }

  async *extractSuppressions(): AsyncGenerator<MigrateSuppression[]> {
    const seen = new Set<string>();
    const lists = await this.client.getLists();

    for (const list of lists.lists) {
      for (const status of ["unsubscribed", "cleaned"] as const) {
        let offset = 0;
        while (true) {
          const data = await this.client.getMembers(
            list.id,
            offset,
            1000,
            status,
          );
          if (data.members.length === 0) break;

          const batch: MigrateSuppression[] = [];
          for (const member of data.members) {
            if (seen.has(member.email_address)) continue;
            seen.add(member.email_address);
            batch.push(mapSuppression(member));
          }

          if (batch.length > 0) yield batch;
          offset += data.members.length;
          if (offset >= data.total_items) break;
        }
      }
    }
  }

  async *extractCampaigns(): AsyncGenerator<MigrateCampaign> {
    let offset = 0;
    while (true) {
      const data = await this.client.getCampaigns(offset);
      if (data.campaigns.length === 0) break;

      for (const c of data.campaigns) {
        try {
          const content = await this.client.getCampaignContent(c.id);
          yield mapCampaign(c, content.html);
        } catch {
          // Skip campaigns we can't fetch content for
        }
      }

      offset += data.campaigns.length;
      if (offset >= data.total_items) break;
    }
  }

  async extractDomains(): Promise<MigrateDomain[]> {
    const domains = await this.client.getVerifiedDomains();
    return domains.map(mapDomain);
  }

  async extractSenders(): Promise<MigrateSender[]> {
    // Mailchimp doesn't have a separate senders endpoint.
    // Extract unique from_email from campaigns as a proxy.
    const senders = new Map<string, MigrateSender>();
    const data = await this.client.getCampaigns();
    for (const c of data.campaigns) {
      if (c.settings.reply_to && !senders.has(c.settings.reply_to)) {
        senders.set(c.settings.reply_to, {
          email: c.settings.reply_to,
          name: c.settings.from_name || undefined,
        });
      }
    }
    return [...senders.values()];
  }
}
