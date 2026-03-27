import type {
  RsAudience,
  RsContact,
  RsDomain,
  RsBroadcast,
  RsListResponse,
} from "./types.js";

const BASE_URL = "https://api.resend.com";

type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;

export class ResendClient {
  private apiKey: string;
  private fetchFn: FetchFn;

  constructor(apiKey: string, fetchFn: FetchFn) {
    this.apiKey = apiKey;
    this.fetchFn = fetchFn;
  }

  private async get<T>(path: string): Promise<T> {
    const res = await this.fetchFn(`${BASE_URL}${path}`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    if (!res.ok) {
      throw new Error(`Resend API error ${res.status}: ${await res.text()}`);
    }
    return res.json() as Promise<T>;
  }

  async validateApiKey(): Promise<boolean> {
    try {
      await this.get("/domains");
      return true;
    } catch {
      return false;
    }
  }

  async getAudiences(): Promise<RsAudience[]> {
    const data = await this.get<RsListResponse<RsAudience>>("/audiences");
    return data.data ?? [];
  }

  async getContacts(audienceId: string): Promise<RsContact[]> {
    const data = await this.get<RsListResponse<RsContact>>(
      `/audiences/${audienceId}/contacts`,
    );
    return data.data ?? [];
  }

  async getDomains(): Promise<RsDomain[]> {
    const data = await this.get<RsListResponse<RsDomain>>("/domains");
    return data.data ?? [];
  }

  async getBroadcasts(): Promise<RsBroadcast[]> {
    const data = await this.get<RsListResponse<RsBroadcast>>("/broadcasts");
    return data.data ?? [];
  }

  async getBroadcast(id: string): Promise<RsBroadcast> {
    return this.get<RsBroadcast>(`/broadcasts/${id}`);
  }
}
