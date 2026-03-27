import type {
  ResourceType,
  ResourceReport,
  MigrationReport,
  MigrateDomain,
  MigrateSender,
} from "../types.js";

export class Reporter {
  private reports = new Map<ResourceType, ResourceReport>();
  private domains: MigrateDomain[] = [];
  private senders: MigrateSender[] = [];
  private startedAt = new Date();
  private provider = "";

  setProvider(provider: string): void {
    this.provider = provider;
  }

  initResource(resource: ResourceType, total: number): void {
    this.reports.set(resource, {
      resource,
      total,
      created: 0,
      skipped: 0,
      errors: 0,
      errorDetails: [],
    });
  }

  recordSuccess(resource: ResourceType, count = 1): void {
    const report = this.reports.get(resource);
    if (report) report.created += count;
  }

  recordSkip(resource: ResourceType, count = 1): void {
    const report = this.reports.get(resource);
    if (report) report.skipped += count;
  }

  recordError(resource: ResourceType, item: string, error: string): void {
    const report = this.reports.get(resource);
    if (report) {
      report.errors += 1;
      report.errorDetails.push({ item, error });
    }
  }

  getReport(resource: ResourceType): ResourceReport | undefined {
    return this.reports.get(resource);
  }

  setDomains(domains: MigrateDomain[]): void {
    this.domains = domains;
  }

  setSenders(senders: MigrateSender[]): void {
    this.senders = senders;
  }

  finalize(dryRun: boolean): MigrationReport {
    return {
      provider: this.provider,
      startedAt: this.startedAt,
      completedAt: new Date(),
      dryRun,
      resources: [...this.reports.values()],
      domains: this.domains,
      senders: this.senders,
    };
  }
}
