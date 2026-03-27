import { describe, it, expect, vi, beforeEach } from "vitest";
import { Migrator } from "../migrator.js";
import type {
  Provider,
  ResourceType,
  MigrateContact,
  MigrateList,
  MigrateTemplate,
  MigrateSuppression,
  MigrateCampaign,
  MigrateDomain,
  MigrateSender,
} from "../types.js";

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function createMockProvider(overrides?: Partial<Provider>): Provider {
  return {
    name: "sendgrid",
    displayName: "SendGrid",
    capabilities: {
      contacts: true,
      lists: true,
      templates: true,
      suppressions: true,
      campaigns: true,
      domains: true,
      senders: true,
    },
    validateCredentials: vi.fn().mockResolvedValue(true),
    getCounts: vi.fn().mockResolvedValue({
      contacts: 2,
      lists: 1,
      templates: 1,
      suppressions: 1,
      campaigns: 1,
    }),
    extractContacts: async function* (): AsyncGenerator<MigrateContact[]> {
      yield [
        { email: "a@test.com", firstName: "Alice" },
        { email: "b@test.com", firstName: "Bob" },
      ];
    },
    extractLists: async function* (): AsyncGenerator<MigrateList> {
      yield { sourceId: "list-1", name: "Newsletter" };
    },
    extractTemplates: async function* (): AsyncGenerator<MigrateTemplate> {
      yield {
        sourceId: "tmpl-1",
        name: "Welcome",
        subject: "Welcome!",
        bodyHtml: "<p>Hello {{first_name}}</p>",
      };
    },
    extractSuppressions: async function* (): AsyncGenerator<
      MigrateSuppression[]
    > {
      yield [{ email: "unsub@test.com", reason: "unsubscribe" }];
    },
    extractCampaigns: async function* (): AsyncGenerator<MigrateCampaign> {
      yield {
        sourceId: "camp-1",
        name: "Launch",
        subject: "We launched!",
        bodyHtml: "<p>Big news</p>",
      };
    },
    extractDomains: vi
      .fn()
      .mockResolvedValue([
        { domain: "test.com", verified: true },
      ] satisfies MigrateDomain[]),
    extractSenders: vi
      .fn()
      .mockResolvedValue([
        { email: "hello@test.com", name: "Hello" },
      ] satisfies MigrateSender[]),
    ...overrides,
  };
}

function mockTransmitResponse(data: unknown = {}) {
  mockFetch.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(""),
  });
}

describe("Migrator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransmitResponse();
  });

  it("runs a dry-run migration without making API calls", async () => {
    const provider = createMockProvider();
    const migrator = new Migrator(provider, {
      provider: "sendgrid",
      providerApiKey: "test",
      transmitApiKey: "pm_live_test",
      resources: ["lists", "contacts", "templates", "suppressions", "campaigns"],
      dryRun: true,
    });

    const report = await migrator.run();

    expect(report.dryRun).toBe(true);
    expect(report.provider).toBe("SendGrid");
    // In dry-run, no HTTP calls to Transmit for creating resources
    // (only the domain/sender extraction calls happen)
    const createCalls = mockFetch.mock.calls.filter(
      (c) => c[1]?.method === "POST",
    );
    expect(createCalls.length).toBe(0);
  });

  it("creates resources in correct order", async () => {
    const callOrder: string[] = [];
    const provider = createMockProvider({
      extractLists: async function* () {
        callOrder.push("lists");
        yield { sourceId: "l1", name: "List 1" };
      },
      extractContacts: async function* () {
        callOrder.push("contacts");
        yield [{ email: "a@test.com" }];
      },
      extractTemplates: async function* () {
        callOrder.push("templates");
        yield {
          sourceId: "t1",
          name: "T",
          subject: "S",
          bodyHtml: "<p>hi</p>",
        };
      },
      extractSuppressions: async function* () {
        callOrder.push("suppressions");
        yield [{ email: "x@test.com", reason: "bounce" as const }];
      },
      extractCampaigns: async function* () {
        callOrder.push("campaigns");
        yield {
          sourceId: "c1",
          name: "C",
          subject: "S",
          bodyHtml: "<p>c</p>",
        };
      },
    });

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: "new-id" }),
      text: () => Promise.resolve(""),
    });

    const migrator = new Migrator(provider, {
      provider: "sendgrid",
      providerApiKey: "test",
      transmitApiKey: "pm_live_test",
      resources: [
        "campaigns",
        "contacts",
        "suppressions",
        "lists",
        "templates",
      ],
      dryRun: false,
    });

    await migrator.run();

    // Order must be: lists, contacts, templates, suppressions, campaigns
    expect(callOrder).toEqual([
      "lists",
      "contacts",
      "templates",
      "suppressions",
      "campaigns",
    ]);
  });

  it("reports domains and senders without importing them", async () => {
    const provider = createMockProvider();
    const migrator = new Migrator(provider, {
      provider: "sendgrid",
      providerApiKey: "test",
      transmitApiKey: "pm_live_test",
      resources: ["contacts"],
      dryRun: true,
    });

    const report = await migrator.run();

    expect(report.domains).toEqual([{ domain: "test.com", verified: true }]);
    expect(report.senders).toEqual([
      { email: "hello@test.com", name: "Hello" },
    ]);
  });

  it("handles API errors gracefully", async () => {
    const provider = createMockProvider();
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve("Internal Server Error"),
    });

    const migrator = new Migrator(provider, {
      provider: "sendgrid",
      providerApiKey: "test",
      transmitApiKey: "pm_live_test",
      resources: ["lists"],
      dryRun: false,
    });

    const report = await migrator.run();
    const listReport = report.resources.find((r) => r.resource === "lists");
    expect(listReport?.errors).toBe(1);
    expect(listReport?.errorDetails[0]?.error).toContain("500");
  });

  it("discovers data counts", async () => {
    const provider = createMockProvider();
    const migrator = new Migrator(provider, {
      provider: "sendgrid",
      providerApiKey: "test",
      transmitApiKey: "pm_live_test",
      resources: [],
    });

    const counts = await migrator.discover();
    expect(counts.contacts).toBe(2);
    expect(counts.lists).toBe(1);
    expect(counts.domains).toBe(1);
    expect(counts.senders).toBe(1);
  });
});
