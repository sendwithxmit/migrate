import type {
  MigrateContact,
  MigrateList,
  MigrateTemplate,
  MigrateSuppression,
  MigrateDomain,
  MigrateSender,
  MigrateCampaign,
} from "../../types.js";
import type {
  SgContact,
  SgList,
  SgTemplate,
  SgSuppression,
  SgDomain,
  SgSender,
  SgSingleSend,
  SgContactExportResult,
} from "./types.js";

export function mapContact(
  c: SgContact | SgContactExportResult,
): MigrateContact {
  const { id, email, first_name, last_name, ...rest } = c;
  const metadata =
    "custom_fields" in c && c.custom_fields
      ? c.custom_fields
      : Object.keys(rest).length > 0
        ? rest
        : undefined;

  return {
    email,
    firstName: first_name || undefined,
    lastName: last_name || undefined,
    metadata: metadata as Record<string, unknown> | undefined,
    sourceId: String(id),
  };
}

export function mapList(l: SgList): MigrateList {
  return {
    sourceId: l.id,
    name: l.name,
  };
}

export function mapTemplate(t: SgTemplate): MigrateTemplate | null {
  const activeVersion =
    t.versions?.find((v) => v.active === 1) ?? t.versions?.[0];
  if (!activeVersion) return null;

  return {
    sourceId: t.id,
    name: t.name,
    subject: activeVersion.subject ?? "",
    bodyHtml: activeVersion.html_content ?? "",
    bodyText: activeVersion.plain_content || undefined,
  };
}

export function mapSuppression(
  s: SgSuppression,
  reason: MigrateSuppression["reason"],
): MigrateSuppression {
  return {
    email: s.email,
    reason,
    source: "sendgrid",
  };
}

export function mapDomain(d: SgDomain): MigrateDomain {
  return {
    domain: d.domain,
    sourceId: String(d.id),
    verified: d.valid,
  };
}

export function mapSender(s: SgSender): MigrateSender {
  return {
    email: s.from_email,
    name: s.from_name || undefined,
    replyTo: s.reply_to || undefined,
  };
}

export function mapCampaign(c: SgSingleSend): MigrateCampaign {
  return {
    sourceId: c.id,
    name: c.name,
    subject: c.email_config?.subject ?? "",
    bodyHtml: c.email_config?.html_content ?? "",
  };
}
