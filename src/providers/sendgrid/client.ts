import type {
  SgListsResponse,
  SgTemplate,
  SgTemplatesResponse,
  SgSuppression,
  SgDomain,
  SgSender,
  SgSingleSend,
  SgExportResponse,
} from "./types.js";

const BASE_URL = "https://api.sendgrid.com/v3";

type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;

export class SendGridClient {
  private apiKey: string;
  private fetchFn: FetchFn;

  constructor(apiKey: string, fetchFn: FetchFn) {
    this.apiKey = apiKey;
    this.fetchFn = fetchFn;
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };
  }

  private async get<T>(path: string): Promise<T> {
    const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;
    const res = await this.fetchFn(url, {
      headers: this.headers(),
    });
    if (!res.ok) {
      throw new Error(`SendGrid API error ${res.status}: ${await res.text()}`);
    }
    return res.json() as Promise<T>;
  }

  private async post<T>(path: string, body?: unknown): Promise<T> {
    const res = await this.fetchFn(`${BASE_URL}${path}`, {
      method: "POST",
      headers: this.headers(),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      throw new Error(`SendGrid API error ${res.status}: ${await res.text()}`);
    }
    return res.json() as Promise<T>;
  }

  async validateApiKey(): Promise<boolean> {
    try {
      await this.get("/scopes");
      return true;
    } catch {
      return false;
    }
  }

  async getContactCount(): Promise<number> {
    const data = await this.get<{ contact_count: number }>(
      "/marketing/contacts/count",
    );
    return data.contact_count;
  }

  async startContactExport(): Promise<string> {
    const data = await this.post<SgExportResponse>(
      "/marketing/contacts/exports",
      { file_type: "json" },
    );
    return data.id;
  }

  async getExportStatus(exportId: string): Promise<SgExportResponse> {
    return this.get<SgExportResponse>(
      `/marketing/contacts/exports/${exportId}`,
    );
  }

  async downloadExport(url: string): Promise<string> {
    const res = await this.fetchFn(url, {});
    return res.text();
  }

  async *getAllLists(): AsyncGenerator<SgListsResponse> {
    let page = `/marketing/lists?page_size=1000`;
    while (page) {
      const data = await this.get<SgListsResponse>(page);
      yield data;
      page = data._metadata?.next ?? "";
    }
  }

  async getListCount(): Promise<number> {
    let total = 0;
    for await (const page of this.getAllLists()) {
      total += page.result?.length ?? 0;
    }
    return total;
  }

  async *getAllTemplates(): AsyncGenerator<SgTemplate[]> {
    let path: string | null = "/templates?generations=dynamic&page_size=200";
    while (path) {
      const data: SgTemplatesResponse = await this.get<SgTemplatesResponse>(path);
      if (data.result?.length) yield data.result;
      path = data._metadata?.next ?? null;
    }
  }

  async getTemplate(id: string): Promise<SgTemplate> {
    return this.get<SgTemplate>(`/templates/${id}`);
  }

  async getSuppressions(
    type: string,
    limit = 500,
    offset = 0,
  ): Promise<SgSuppression[]> {
    return this.get<SgSuppression[]>(
      `/suppression/${type}?limit=${limit}&offset=${offset}`,
    );
  }

  async *getAllSuppressions(type: string): AsyncGenerator<SgSuppression[]> {
    let offset = 0;
    const limit = 500;
    while (true) {
      const batch = await this.getSuppressions(type, limit, offset);
      if (!batch.length) break;
      yield batch;
      if (batch.length < limit) break;
      offset += batch.length;
    }
  }

  async getDomains(): Promise<SgDomain[]> {
    return this.get<SgDomain[]>("/whitelabel/domains");
  }

  async getSenders(): Promise<{ results: SgSender[] }> {
    return this.get<{ results: SgSender[] }>("/verified_senders");
  }

  async getSingleSends(): Promise<{ result: SgSingleSend[] }> {
    return this.get<{ result: SgSingleSend[] }>("/marketing/singlesends");
  }
}
