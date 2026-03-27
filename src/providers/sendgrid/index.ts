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
import { SendGridClient } from "./client.js";
import {
  mapContact,
  mapList,
  mapTemplate,
  mapSuppression,
  mapDomain,
  mapSender,
  mapCampaign,
} from "./mappers.js";
import type { SgContactExportResult } from "./types.js";

const SUPPRESSION_TYPES = [
  { endpoint: "bounces", reason: "bounce" as const },
  { endpoint: "blocks", reason: "bounce" as const },
  { endpoint: "invalid_emails", reason: "bounce" as const },
  { endpoint: "spam_reports", reason: "complaint" as const },
  { endpoint: "unsubscribes", reason: "unsubscribe" as const },
];

export class SendGridProvider extends BaseProvider {
  readonly name = "sendgrid";
  readonly displayName = "SendGrid";
  readonly capabilities: Record<ResourceType, boolean> = {
    contacts: true,
    lists: true,
    templates: true,
    suppressions: true,
    campaigns: true,
    domains: true,
    senders: true,
  };

  private client: SendGridClient;

  constructor(credentials: ProviderCredentials) {
    super(credentials, 10);
    this.client = new SendGridClient(
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
      counts.contacts = await this.client.getContactCount();
    }
    if (resources.includes("lists")) {
      counts.lists = await this.client.getListCount();
    }
    if (resources.includes("templates")) {
      let total = 0;
      for await (const batch of this.client.getAllTemplates()) {
        total += batch.length;
      }
      counts.templates = total;
    }
    if (resources.includes("suppressions")) {
      let total = 0;
      for (const { endpoint } of SUPPRESSION_TYPES) {
        for await (const batch of this.client.getAllSuppressions(endpoint)) {
          total += batch.length;
        }
      }
      counts.suppressions = total;
    }
    if (resources.includes("campaigns")) {
      const data = await this.client.getSingleSends();
      counts.campaigns = data.result?.length ?? 0;
    }

    return counts;
  }

  async *extractContacts(): AsyncGenerator<MigrateContact[]> {
    const exportId = await this.client.startContactExport();

    let waitMs = 2000;
    while (true) {
      await new Promise((r) => setTimeout(r, waitMs));
      const status = await this.client.getExportStatus(exportId);

      if (status.status === "ready" && status.urls) {
        for (const url of status.urls) {
          const text = await this.client.downloadExport(url);
          const lines = text.trim().split("\n");
          const batch: MigrateContact[] = [];

          for (const line of lines) {
            if (!line.trim()) continue;
            const raw = JSON.parse(line) as SgContactExportResult;
            batch.push(mapContact(raw));

            if (batch.length >= 500) {
              yield [...batch];
              batch.length = 0;
            }
          }

          if (batch.length > 0) yield batch;
        }
        return;
      }

      if (status.status === "failure") {
        throw new Error("SendGrid contact export failed");
      }

      waitMs = Math.min(waitMs * 2, 30000);
    }
  }

  async *extractLists(): AsyncGenerator<MigrateList> {
    for await (const page of this.client.getAllLists()) {
      for (const list of page.result ?? []) {
        yield mapList(list);
      }
    }
  }

  async *extractTemplates(): AsyncGenerator<MigrateTemplate> {
    for await (const batch of this.client.getAllTemplates()) {
      for (const t of batch) {
        const full = await this.client.getTemplate(t.id);
        const mapped = mapTemplate(full);
        if (mapped) yield mapped;
      }
    }
  }

  async *extractSuppressions(): AsyncGenerator<MigrateSuppression[]> {
    for (const { endpoint, reason } of SUPPRESSION_TYPES) {
      for await (const batch of this.client.getAllSuppressions(endpoint)) {
        yield batch.map((s) => mapSuppression(s, reason));
      }
    }
  }

  async *extractCampaigns(): AsyncGenerator<MigrateCampaign> {
    const data = await this.client.getSingleSends();
    for (const c of data.result ?? []) {
      yield mapCampaign(c);
    }
  }

  async extractDomains(): Promise<MigrateDomain[]> {
    const domains = await this.client.getDomains();
    return domains.map(mapDomain);
  }

  async extractSenders(): Promise<MigrateSender[]> {
    const data = await this.client.getSenders();
    return (data.results ?? []).map(mapSender);
  }
}
