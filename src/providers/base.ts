import type {
  Provider,
  ResourceType,
  ProviderCredentials,
  MigrateContact,
  MigrateList,
  MigrateTemplate,
  MigrateSuppression,
  MigrateCampaign,
  MigrateDomain,
  MigrateSender,
} from "../types.js";
import { RateLimiter } from "../client/rate-limiter.js";

export abstract class BaseProvider implements Provider {
  abstract readonly name: string;
  abstract readonly displayName: string;
  abstract readonly capabilities: Record<ResourceType, boolean>;

  protected credentials: ProviderCredentials;
  protected limiter: RateLimiter;

  constructor(credentials: ProviderCredentials, requestsPerSecond = 10) {
    this.credentials = credentials;
    this.limiter = new RateLimiter(requestsPerSecond, requestsPerSecond);
  }

  abstract validateCredentials(): Promise<boolean>;
  abstract getCounts(
    resources: ResourceType[],
  ): Promise<Partial<Record<ResourceType, number>>>;

  abstract extractContacts(): AsyncGenerator<MigrateContact[]>;
  abstract extractLists(): AsyncGenerator<MigrateList>;
  abstract extractTemplates(): AsyncGenerator<MigrateTemplate>;
  abstract extractSuppressions(): AsyncGenerator<MigrateSuppression[]>;
  abstract extractCampaigns(): AsyncGenerator<MigrateCampaign>;

  abstract extractDomains(): Promise<MigrateDomain[]>;
  abstract extractSenders(): Promise<MigrateSender[]>;

  /**
   * Fetch with rate limiting and retry on 429.
   */
  protected async fetchWithRetry(
    url: string,
    init?: RequestInit,
    maxRetries = 3,
  ): Promise<Response> {
    await this.limiter.acquire();

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const res = await fetch(url, init);

      if (res.status === 429) {
        const retryAfter = res.headers.get("retry-after");
        const waitMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : 1000 * 2 ** attempt;
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }

      return res;
    }

    throw new Error(`Request failed after ${maxRetries} retries: ${url}`);
  }
}
