import type {
  BrContactsResponse,
  BrListsResponse,
  BrTemplatesResponse,
  BrCampaign,
  BrCampaignsResponse,
  BrBlockedResponse,
  BrDomain,
  BrSender,
} from "./types.js";

const BASE_URL = "https://api.brevo.com/v3";

type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;

export class BrevoClient {
  private apiKey: string;
  private fetchFn: FetchFn;

  constructor(apiKey: string, fetchFn: FetchFn) {
    this.apiKey = apiKey;
    this.fetchFn = fetchFn;
  }

  private async get<T>(path: string): Promise<T> {
    const res = await this.fetchFn(`${BASE_URL}${path}`, {
      headers: { "api-key": this.apiKey },
    });
    if (!res.ok) {
      throw new Error(`Brevo API error ${res.status}: ${await res.text()}`);
    }
    return res.json() as Promise<T>;
  }

  async validateApiKey(): Promise<boolean> {
    try {
      await this.get("/account");
      return true;
    } catch {
      return false;
    }
  }

  async getContacts(limit = 50, offset = 0): Promise<BrContactsResponse> {
    return this.get<BrContactsResponse>(
      `/contacts?limit=${limit}&offset=${offset}`,
    );
  }

  async getLists(limit = 50, offset = 0): Promise<BrListsResponse> {
    return this.get<BrListsResponse>(
      `/contacts/lists?limit=${limit}&offset=${offset}`,
    );
  }

  async getTemplates(limit = 50, offset = 0): Promise<BrTemplatesResponse> {
    return this.get<BrTemplatesResponse>(
      `/smtp/templates?limit=${limit}&offset=${offset}`,
    );
  }

  async getCampaigns(limit = 50, offset = 0): Promise<BrCampaignsResponse> {
    return this.get<BrCampaignsResponse>(
      `/emailCampaigns?limit=${limit}&offset=${offset}`,
    );
  }

  async getCampaign(id: number): Promise<BrCampaign> {
    return this.get<BrCampaign>(`/emailCampaigns/${id}`);
  }

  async getBlockedContacts(
    limit = 50,
    offset = 0,
  ): Promise<BrBlockedResponse> {
    return this.get<BrBlockedResponse>(
      `/smtp/blockedContacts?limit=${limit}&offset=${offset}`,
    );
  }

  async getDomains(): Promise<BrDomain[]> {
    const data = await this.get<{ domains: BrDomain[] }>("/senders/domains");
    return data.domains ?? [];
  }

  async getSenders(): Promise<BrSender[]> {
    const data = await this.get<{ senders: BrSender[] }>("/senders");
    return data.senders ?? [];
  }
}
