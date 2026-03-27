import { Command } from "commander";
import { select, input, checkbox, confirm } from "@inquirer/prompts";
import chalk from "chalk";
import { getProvider, getProviderNames } from "./providers/registry.js";
import { Migrator } from "./migrator.js";
import { IMPORTABLE_RESOURCES, type ImportableResource } from "./types.js";

const program = new Command();

program
  .name("xmit-migrate")
  .description("Migrate your email data from any ESP to Transmit")
  .version("0.1.0")
  .option("--provider <name>", "Source provider (sendgrid, mailchimp, brevo, resend)")
  .option("--api-key <key>", "Source provider API key")
  .option("--transmit-key <key>", "Transmit API key")
  .option("--transmit-url <url>", "Transmit API URL (default: https://api.xmit.sh)")
  .option("--resources <list>", "Comma-separated resources to migrate")
  .option("--dry-run", "Preview migration without making changes")
  .option("--batch-size <n>", "Batch size for imports", parseInt)
  .option("--no-interactive", "Run without interactive prompts")
  .option("--verbose", "Show detailed output")
  .action(async (opts) => {
    printBanner();

    const interactive = opts.interactive !== false;

    // Provider selection
    let providerName = opts.provider;
    if (!providerName && interactive) {
      providerName = await select({
        message: "Select source provider:",
        choices: getProviderNames().map((name) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          value: name,
        })),
      });
    }
    if (!providerName) {
      console.error(chalk.red("Error: --provider is required in non-interactive mode"));
      process.exit(1);
    }

    // Provider API key
    let apiKey = opts.apiKey;
    if (!apiKey && interactive) {
      apiKey = await input({
        message: `Enter your ${providerName} API key:`,
        validate: (v) => (v.length > 0 ? true : "API key is required"),
      });
    }
    if (!apiKey) {
      console.error(chalk.red("Error: --api-key is required"));
      process.exit(1);
    }

    // Extract datacenter for Mailchimp
    const datacenter =
      providerName === "mailchimp" ? apiKey.split("-").pop() : undefined;

    // Create and validate provider
    const provider = getProvider(providerName, { apiKey, datacenter });

    console.log("");
    process.stdout.write("  Validating credentials... ");
    const valid = await provider.validateCredentials();
    if (!valid) {
      console.log(chalk.red("failed"));
      console.error(chalk.red("  Could not validate API key. Check it and try again."));
      process.exit(1);
    }
    console.log(chalk.green("done"));

    // Transmit API key
    let transmitKey = opts.transmitKey;
    if (!transmitKey && interactive) {
      transmitKey = await input({
        message: "Enter your Transmit API key:",
        validate: (v) =>
          v.startsWith("pm_live_") ? true : "Must start with pm_live_",
      });
    }
    if (!transmitKey) {
      console.error(chalk.red("Error: --transmit-key is required"));
      process.exit(1);
    }

    const migrator = new Migrator(provider, {
      provider: providerName,
      providerApiKey: apiKey,
      transmitApiKey: transmitKey,
      transmitUrl: opts.transmitUrl,
      resources: [], // will be set after discovery
      dryRun: opts.dryRun,
      batchSize: opts.batchSize,
      verbose: opts.verbose,
    });

    // Discover data
    await migrator.discover();

    // Resource selection
    let selectedResources: ImportableResource[];
    if (opts.resources) {
      selectedResources = opts.resources.split(",") as ImportableResource[];
    } else if (interactive) {
      const available = IMPORTABLE_RESOURCES.filter(
        (r) => provider.capabilities[r],
      );
      selectedResources = await checkbox({
        message: "Select data to migrate:",
        choices: available.map((r) => ({
          name: r.charAt(0).toUpperCase() + r.slice(1),
          value: r,
          checked: true,
        })),
      });
    } else {
      selectedResources = [...IMPORTABLE_RESOURCES].filter(
        (r) => provider.capabilities[r],
      );
    }

    if (selectedResources.length === 0) {
      console.log(chalk.yellow("No resources selected. Exiting."));
      process.exit(0);
    }

    // Dry run prompt
    let dryRun = opts.dryRun ?? false;
    if (!dryRun && interactive) {
      dryRun = await confirm({
        message: "Dry run first?",
        default: true,
      });
    }

    // Confirm
    if (interactive && !dryRun) {
      const proceed = await confirm({
        message: "Proceed with actual migration?",
        default: true,
      });
      if (!proceed) {
        console.log("Migration cancelled.");
        process.exit(0);
      }
    }

    // Update config and run
    const config = {
      provider: providerName,
      providerApiKey: apiKey,
      transmitApiKey: transmitKey,
      transmitUrl: opts.transmitUrl,
      resources: selectedResources,
      dryRun,
      batchSize: opts.batchSize,
      verbose: opts.verbose,
    };

    const finalMigrator = new Migrator(provider, config);
    await finalMigrator.run();
  });

function printBanner(): void {
  console.log("");
  console.log(chalk.bold("  xmit-migrate"));
  console.log(chalk.dim("  Migrate your email data to Transmit"));
  console.log("");
}

program.parse();
