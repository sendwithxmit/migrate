import ora, { type Ora } from "ora";
import chalk from "chalk";
import type { ResourceType, MigrationReport } from "../types.js";

export class Progress {
  private spinner: Ora | null = null;
  private silent: boolean;

  constructor(silent = false) {
    this.silent = silent;
  }

  start(text: string): void {
    if (this.silent) return;
    this.spinner = ora(text).start();
  }

  update(text: string): void {
    if (this.spinner) this.spinner.text = text;
  }

  succeed(text: string): void {
    if (this.spinner) this.spinner.succeed(text);
    this.spinner = null;
  }

  fail(text: string): void {
    if (this.spinner) this.spinner.fail(text);
    this.spinner = null;
  }

  stop(): void {
    if (this.spinner) this.spinner.stop();
    this.spinner = null;
  }

  log(text: string): void {
    if (!this.silent) console.log(text);
  }

  resourceProgress(
    resource: ResourceType,
    current: number,
    total: number,
    step: number,
    totalSteps: number,
  ): void {
    this.update(
      `[${step}/${totalSteps}] ${capitalize(resource)}  ${current.toLocaleString()}/${total.toLocaleString()}`,
    );
  }

  printCounts(counts: Partial<Record<ResourceType, number>>): void {
    if (this.silent) return;
    console.log("");
    console.log(chalk.bold("  Discovered data:"));
    for (const [resource, count] of Object.entries(counts)) {
      const isReportOnly =
        resource === "domains" || resource === "senders";
      const suffix = isReportOnly ? chalk.dim(" (report only)") : "";
      console.log(
        `    ${capitalize(resource).padEnd(14)} ${chalk.cyan(String(count).toLocaleString())}${suffix}`,
      );
    }
    console.log("");
  }

  printReport(report: MigrationReport): void {
    if (this.silent) return;

    const elapsed = report.completedAt.getTime() - report.startedAt.getTime();
    const seconds = Math.floor(elapsed / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    const timeStr =
      minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${seconds}s`;

    console.log("");
    console.log(
      chalk.bold.green(
        `  --- Migration ${report.dryRun ? "Dry Run " : ""}Complete (${timeStr}) ---`,
      ),
    );
    console.log("");

    // Resource summary table
    const header = `  ${"Resource".padEnd(14)} ${"Created".padEnd(10)} ${"Skipped".padEnd(10)} ${"Errors".padEnd(10)}`;
    console.log(chalk.dim(header));
    console.log(chalk.dim("  " + "-".repeat(44)));

    for (const r of report.resources) {
      const created = chalk.green(String(r.created).padEnd(10));
      const skipped = chalk.yellow(String(r.skipped).padEnd(10));
      const errors =
        r.errors > 0
          ? chalk.red(String(r.errors).padEnd(10))
          : String(r.errors).padEnd(10);
      console.log(
        `  ${capitalize(r.resource).padEnd(14)} ${created} ${skipped} ${errors}`,
      );
    }

    // Error details
    const allErrors = report.resources.flatMap((r) => r.errorDetails);
    if (allErrors.length > 0) {
      console.log("");
      console.log(chalk.bold.red(`  Errors (${allErrors.length}):`));
      for (const e of allErrors.slice(0, 10)) {
        console.log(chalk.red(`    ${e.item}: ${e.error}`));
      }
      if (allErrors.length > 10) {
        console.log(
          chalk.dim(`    ... and ${allErrors.length - 10} more`),
        );
      }
    }

    // Domain & sender checklist
    if (report.domains.length > 0 || report.senders.length > 0) {
      console.log("");
      console.log(chalk.bold("  --- Domain & Sender Checklist ---"));
      console.log(
        chalk.dim(
          "  The following were found in your source provider.",
        ),
      );
      console.log(
        chalk.dim(
          "  Add them manually in Transmit when you're ready to switch DNS:",
        ),
      );

      if (report.domains.length > 0) {
        console.log("");
        console.log(chalk.bold("  Domains:"));
        for (const d of report.domains) {
          const status = d.verified ? chalk.green("verified") : chalk.yellow("unverified");
          console.log(`    ${d.domain} (${status})`);
        }
      }

      if (report.senders.length > 0) {
        console.log("");
        console.log(chalk.bold("  Senders:"));
        for (const s of report.senders) {
          const label = s.name ? `${s.email} (${s.name})` : s.email;
          console.log(`    ${label}`);
        }
      }
    }

    console.log("");
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
