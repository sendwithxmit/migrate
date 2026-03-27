import type {
  MigrateContact,
  MigrateList,
  MigrateTemplate,
  MigrateSuppression,
  MigrateDomain,
  MigrateCampaign,
} from "../../types.js";
import type {
  McMember,
  McList,
  McTemplate,
  McCampaign,
  McVerifiedDomain,
} from "./types.js";

export function mapContact(m: McMember): MigrateContact {
  const firstName = m.merge_fields?.FNAME || undefined;
  const lastName = m.merge_fields?.LNAME || undefined;

  const metadata: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(m.merge_fields ?? {})) {
    if (key !== "FNAME" && key !== "LNAME" && value) {
      metadata[key] = value;
    }
  }

  return {
    email: m.email_address,
    firstName,
    lastName,
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    sourceId: m.id,
  };
}

export function mapList(l: McList): MigrateList {
  return {
    sourceId: l.id,
    name: l.name,
  };
}

export function mapTemplate(
  t: McTemplate,
  htmlContent: string,
): MigrateTemplate {
  return {
    sourceId: String(t.id),
    name: t.name,
    subject: "",
    bodyHtml: htmlContent,
  };
}

export function mapSuppression(m: McMember): MigrateSuppression {
  return {
    email: m.email_address,
    reason: m.status === "cleaned" ? "bounce" : "unsubscribe",
    source: "mailchimp",
  };
}

export function mapDomain(d: McVerifiedDomain): MigrateDomain {
  return {
    domain: d.domain,
    verified: d.verified,
  };
}

export function mapCampaign(
  c: McCampaign,
  htmlContent: string,
): MigrateCampaign {
  return {
    sourceId: c.id,
    name: c.settings.title,
    subject: c.settings.subject_line,
    bodyHtml: htmlContent,
  };
}
