import type {
  Provider,
  ImportableResource,
  IdMap,
  MigrateConfig,
  MigrationReport,
} from "./types.js";
import { TransmitClient } from "./client/transmit-client.js";
import { Reporter } from "./reporting/reporter.js";
import { Progress } from "./reporting/progress.js";
import { convertVariables } from "./transformers/variable-converter.js";

export class Migrator {
  private provider: Provider;
  private client: TransmitClient;
  private reporter: Reporter;
  private progress: Progress;
  private config: MigrateConfig;
  private listIdMap: IdMap = new Map();
  private variablesConverted = 0;

  constructor(provider: Provider, config: MigrateConfig) {
    this.provider = provider;
    this.config = config;
    this.client = new TransmitClient({
      apiKey: config.transmitApiKey,
      baseUrl: config.transmitUrl,
    });
    this.reporter = new Reporter();
    this.progress = new Progress(false);
    this.reporter.setProvider(provider.displayName);
  }

  async run(): Promise<MigrationReport> {
    const resources = this.config.resources;
    const totalSteps = resources.length;
    let step = 0;

    // Always extract domains/senders for the report
    this.progress.start("Extracting domain and sender info...");
    const [domains, senders] = await Promise.all([
      this.provider.extractDomains(),
      this.provider.extractSenders(),
    ]);
    this.reporter.setDomains(domains);
    this.reporter.setSenders(senders);
    this.progress.succeed("Domain and sender info collected");

    // Migration order: lists -> contacts -> templates -> suppressions -> campaigns
    const ordered: ImportableResource[] = [
      "lists",
      "contacts",
      "templates",
      "suppressions",
      "campaigns",
    ];

    for (const resource of ordered) {
      if (!resources.includes(resource)) continue;
      if (!this.provider.capabilities[resource]) continue;

      step++;

      switch (resource) {
        case "lists":
          await this.migrateLists(step, totalSteps);
          break;
        case "contacts":
          await this.migrateContacts(step, totalSteps);
          break;
        case "templates":
          await this.migrateTemplates(step, totalSteps);
          break;
        case "suppressions":
          await this.migrateSuppressions(step, totalSteps);
          break;
        case "campaigns":
          await this.migrateCampaigns(step, totalSteps);
          break;
      }
    }

    const report = this.reporter.finalize(this.config.dryRun ?? false);
    this.progress.printReport(report);
    return report;
  }

  async discover(): Promise<
    Partial<Record<string, number>> & {
      domains: number;
      senders: number;
    }
  > {
    this.progress.start("Discovering data...");

    const allResources = [
      "contacts",
      "lists",
      "templates",
      "suppressions",
      "campaigns",
      "domains",
      "senders",
    ] as const;

    const supported = allResources.filter(
      (r) => this.provider.capabilities[r],
    );
    const counts = await this.provider.getCounts([...supported]);

    const domains = await this.provider.extractDomains();
    const senders = await this.provider.extractSenders();
    this.reporter.setDomains(domains);
    this.reporter.setSenders(senders);

    counts.domains = domains.length;
    counts.senders = senders.length;

    this.progress.succeed("Discovery complete");
    this.progress.printCounts(counts);

    return counts as Partial<Record<string, number>> & {
      domains: number;
      senders: number;
    };
  }

  private async migrateLists(step: number, totalSteps: number): Promise<void> {
    this.progress.start(`[${step}/${totalSteps}] Migrating lists...`);
    let count = 0;

    const report = this.reporter;
    report.initResource("lists", 0);

    for await (const list of this.provider.extractLists()) {
      report.initResource("lists", ++count);
      this.progress.resourceProgress("lists", count, count, step, totalSteps);

      if (this.config.dryRun) {
        report.recordSuccess("lists");
        continue;
      }

      const result = await this.client.createList({
        name: list.name,
        description: list.description,
      });

      if (result.ok && result.data) {
        this.listIdMap.set(list.sourceId, result.data.id);
        report.recordSuccess("lists");
      } else {
        report.recordError("lists", list.name, result.error ?? "Unknown error");
      }
    }

    // Update total
    const listReport = report.getReport("lists");
    if (listReport) listReport.total = count;

    this.progress.succeed(
      `[${step}/${totalSteps}] Lists  ${count}/${count} done`,
    );
  }

  private async migrateContacts(
    step: number,
    totalSteps: number,
  ): Promise<void> {
    this.progress.start(`[${step}/${totalSteps}] Migrating contacts...`);
    let count = 0;
    const batchSize = this.config.batchSize ?? 500;

    const report = this.reporter;
    report.initResource("contacts", 0);

    for await (const batch of this.provider.extractContacts()) {
      count += batch.length;
      report.initResource("contacts", count);
      this.progress.resourceProgress(
        "contacts",
        count,
        count,
        step,
        totalSteps,
      );

      if (this.config.dryRun) {
        report.recordSuccess("contacts", batch.length);
        continue;
      }

      // Send in sub-batches if needed
      for (let i = 0; i < batch.length; i += batchSize) {
        const chunk = batch.slice(i, i + batchSize);
        const result = await this.client.importContacts(chunk);

        if (result.ok) {
          report.recordSuccess("contacts", chunk.length);
        } else {
          report.recordError(
            "contacts",
            `batch of ${chunk.length}`,
            result.error ?? "Unknown error",
          );
        }
      }
    }

    const contactReport = report.getReport("contacts");
    if (contactReport) contactReport.total = count;

    this.progress.succeed(
      `[${step}/${totalSteps}] Contacts  ${count.toLocaleString()}/${count.toLocaleString()} done`,
    );
  }

  private async migrateTemplates(
    step: number,
    totalSteps: number,
  ): Promise<void> {
    this.progress.start(`[${step}/${totalSteps}] Migrating templates...`);
    let count = 0;

    const report = this.reporter;
    report.initResource("templates", 0);

    for await (const template of this.provider.extractTemplates()) {
      count++;
      report.initResource("templates", count);
      this.progress.resourceProgress(
        "templates",
        count,
        count,
        step,
        totalSteps,
      );

      // Convert variables
      const { html, variables } = convertVariables(
        this.provider.name,
        template.bodyHtml,
      );
      if (variables.length > 0) this.variablesConverted++;

      if (this.config.dryRun) {
        report.recordSuccess("templates");
        continue;
      }

      const result = await this.client.createTemplate({
        name: template.name,
        subject: template.subject,
        bodyHtml: html,
        bodyText: template.bodyText,
        variables,
      });

      if (result.ok) {
        report.recordSuccess("templates");
      } else {
        report.recordError(
          "templates",
          template.name,
          result.error ?? "Unknown error",
        );
      }
    }

    const templateReport = report.getReport("templates");
    if (templateReport) templateReport.total = count;

    const varSuffix =
      this.variablesConverted > 0
        ? ` (${this.variablesConverted} variables converted)`
        : "";
    this.progress.succeed(
      `[${step}/${totalSteps}] Templates  ${count}/${count} done${varSuffix}`,
    );
  }

  private async migrateSuppressions(
    step: number,
    totalSteps: number,
  ): Promise<void> {
    this.progress.start(`[${step}/${totalSteps}] Migrating suppressions...`);
    let count = 0;

    const report = this.reporter;
    report.initResource("suppressions", 0);

    for await (const batch of this.provider.extractSuppressions()) {
      count += batch.length;
      report.initResource("suppressions", count);
      this.progress.resourceProgress(
        "suppressions",
        count,
        count,
        step,
        totalSteps,
      );

      if (this.config.dryRun) {
        report.recordSuccess("suppressions", batch.length);
        continue;
      }

      for (const suppression of batch) {
        const result = await this.client.createSuppression(suppression);
        if (result.ok) {
          report.recordSuccess("suppressions");
        } else {
          report.recordError(
            "suppressions",
            suppression.email,
            result.error ?? "Unknown error",
          );
        }
      }
    }

    const suppressionReport = report.getReport("suppressions");
    if (suppressionReport) suppressionReport.total = count;

    this.progress.succeed(
      `[${step}/${totalSteps}] Suppressions  ${count.toLocaleString()}/${count.toLocaleString()} done`,
    );
  }

  private async migrateCampaigns(
    step: number,
    totalSteps: number,
  ): Promise<void> {
    this.progress.start(`[${step}/${totalSteps}] Migrating campaigns...`);
    let count = 0;

    const report = this.reporter;
    report.initResource("campaigns", 0);

    for await (const campaign of this.provider.extractCampaigns()) {
      count++;
      report.initResource("campaigns", count);
      this.progress.resourceProgress(
        "campaigns",
        count,
        count,
        step,
        totalSteps,
      );

      if (this.config.dryRun) {
        report.recordSuccess("campaigns");
        continue;
      }

      const result = await this.client.createCampaign({
        name: campaign.name,
        subject: campaign.subject,
        bodyHtml: campaign.bodyHtml,
      });

      if (result.ok) {
        report.recordSuccess("campaigns");
      } else {
        report.recordError(
          "campaigns",
          campaign.name,
          result.error ?? "Unknown error",
        );
      }
    }

    const campaignReport = report.getReport("campaigns");
    if (campaignReport) campaignReport.total = count;

    this.progress.succeed(
      `[${step}/${totalSteps}] Campaigns  ${count}/${count} done`,
    );
  }
}
