import type { Provider, ProviderCredentials } from "../types.js";
import { SendGridProvider } from "./sendgrid/index.js";
import { MailchimpProvider } from "./mailchimp/index.js";
import { BrevoProvider } from "./brevo/index.js";
import { ResendProvider } from "./resend/index.js";

type ProviderConstructor = new (credentials: ProviderCredentials) => Provider;

const registry = new Map<string, ProviderConstructor>([
  ["sendgrid", SendGridProvider],
  ["mailchimp", MailchimpProvider],
  ["brevo", BrevoProvider],
  ["resend", ResendProvider],
]);

export function getProvider(
  name: string,
  credentials: ProviderCredentials,
): Provider {
  const Constructor = registry.get(name);
  if (!Constructor) {
    throw new Error(
      `Unknown provider: ${name}. Available: ${[...registry.keys()].join(", ")}`,
    );
  }
  return new Constructor(credentials);
}

export function getProviderNames(): string[] {
  return [...registry.keys()];
}

export function registerProvider(
  name: string,
  constructor: ProviderConstructor,
): void {
  registry.set(name, constructor);
}
