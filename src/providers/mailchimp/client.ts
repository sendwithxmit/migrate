import type {
  McListsResponse,
  McMembersResponse,
  McTemplatesResponse,
  McCampaignsResponse,
  McCampaignContent,
  McVerifiedDomain,
} from "./types.js";

type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;

export class MailchimpClient {
  private baseUrl: string;
  private authHeader: string;
  private fetchFn: FetchFn;

  constructor(apiKey: string, fetchFn: FetchFn) {
    const datacenter = apiKey.split("-").pop();
    this.baseUrl = `https://${datacenter}.api.mailchimp.com/3.0`;
    this.authHeader =
      "Basic " + Buffer.from(`anystring:${apiKey}`).toString("base64");
    this.fetchFn = fetchFn;
  }

  private async get<T>(path: string): Promise<T> {
    const res = await this.fetchFn(`${this.baseUrl}${path}`, {
      headers: { Authorization: this.authHeader },
    });
    if (!res.ok) {
      throw new Error(
        `Mailchimp API error ${res.status}: ${await res.text()}`,
      );
    }
    return res.json() as Promise<T>;
  }

  async validateApiKey(): Promise<boolean> {
    try {
      await this.get("/");
      return true;
    } catch {
      return false;
    }
  }

  async getLists(offset = 0, count = 1000): Promise<McListsResponse> {
    return this.get<McListsResponse>(
      `/lists?count=${count}&offset=${offset}`,
    );
  }

  async getMembers(
    listId: string,
    offset = 0,
    count = 1000,
    status?: string,
  ): Promise<McMembersResponse> {
    const statusParam = status ? `&status=${status}` : "";
    return this.get<McMembersResponse>(
      `/lists/${listId}/members?count=${count}&offset=${offset}${statusParam}`,
    );
  }

  async getTemplates(offset = 0, count = 1000): Promise<McTemplatesResponse> {
    return this.get<McTemplatesResponse>(
      `/templates?type=user&count=${count}&offset=${offset}`,
    );
  }

  async getTemplateContent(
    templateId: number,
  ): Promise<{ html: string }> {
    return this.get<{ html: string }>(
      `/templates/${templateId}/default-content`,
    );
  }

  async getCampaigns(
    offset = 0,
    count = 1000,
  ): Promise<McCampaignsResponse> {
    return this.get<McCampaignsResponse>(
      `/campaigns?count=${count}&offset=${offset}`,
    );
  }

  async getCampaignContent(campaignId: string): Promise<McCampaignContent> {
    return this.get<McCampaignContent>(`/campaigns/${campaignId}/content`);
  }

  async getVerifiedDomains(): Promise<McVerifiedDomain[]> {
    const data = await this.get<
      McVerifiedDomain[] | { domains: McVerifiedDomain[] }
    >("/verified-domains");
    // API may return flat array or {domains: [...]} depending on version
    return Array.isArray(data) ? data : data.domains ?? [];
  }
}
