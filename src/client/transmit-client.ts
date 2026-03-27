import { RateLimiter } from "./rate-limiter.js";
import type {
  MigrateContact,
  MigrateList,
  MigrateTemplate,
  MigrateSuppression,
  MigrateCampaign,
} from "../types.js";

const DEFAULT_BASE_URL = "https://api.xmit.sh";

interface TransmitClientOptions {
  apiKey: string;
  baseUrl?: string;
}

interface ApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

export class TransmitClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly limiter: RateLimiter;

  constructor(options: TransmitClientOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    this.limiter = new RateLimiter(10, 10); // 10 req/s
  }

  private async request<T = unknown>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<ApiResponse<T>> {
    await this.limiter.acquire();

    const res = await fetch(`${this.baseUrl}/api${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "Unknown error");
      return { ok: false, error: `${res.status}: ${text}` };
    }

    const data = (await res.json().catch(() => ({}))) as T;
    return { ok: true, data };
  }

  async validateConnection(): Promise<boolean> {
    const res = await this.request("GET", "/domains");
    return res.ok;
  }

  async importContacts(
    contacts: MigrateContact[],
    listId?: string,
  ): Promise<ApiResponse<{ created: number; skipped: number }>> {
    return this.request("POST", "/contacts/import", {
      contacts: contacts.map((c) => ({
        email: c.email,
        firstName: c.firstName,
        lastName: c.lastName,
        metadata: c.metadata,
      })),
      listId,
    });
  }

  async createList(
    list: Pick<MigrateList, "name" | "description">,
  ): Promise<ApiResponse<{ id: string }>> {
    return this.request("POST", "/lists", {
      name: list.name,
      description: list.description,
    });
  }

  async addContactsToList(
    listId: string,
    contactIds: string[],
  ): Promise<ApiResponse> {
    return this.request("POST", `/lists/${listId}/contacts`, { contactIds });
  }

  async createTemplate(
    template: Omit<MigrateTemplate, "sourceId">,
  ): Promise<ApiResponse<{ id: string }>> {
    return this.request("POST", "/templates", {
      name: template.name,
      subject: template.subject,
      bodyHtml: template.bodyHtml,
      bodyText: template.bodyText,
      variables: template.variables,
    });
  }

  async createSuppression(
    suppression: MigrateSuppression,
  ): Promise<ApiResponse> {
    return this.request("POST", "/suppressions", {
      email: suppression.email,
      reason: suppression.reason,
      source: suppression.source ?? "migration",
    });
  }

  async createCampaign(
    campaign: Omit<MigrateCampaign, "sourceId">,
  ): Promise<ApiResponse<{ id: string }>> {
    return this.request("POST", "/campaigns", {
      name: campaign.name,
      subject: campaign.subject,
      bodyHtml: campaign.bodyHtml,
      listId: campaign.listSourceId,
    });
  }
}
