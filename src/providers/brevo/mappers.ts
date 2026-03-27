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
  BrContact,
  BrList,
  BrTemplate,
  BrBlockedContact,
  BrDomain,
  BrSender,
  BrCampaign,
} from "./types.js";

export function mapContact(c: BrContact): MigrateContact {
  const attrs = c.attributes ?? {};
  const firstName = String(attrs.FIRSTNAME || "") || undefined;
  const lastName = String(attrs.LASTNAME || "") || undefined;

  const metadata: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(attrs)) {
    if (key !== "FIRSTNAME" && key !== "LASTNAME" && value != null) {
      metadata[key] = value;
    }
  }

  return {
    email: c.email,
    firstName,
    lastName,
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    sourceId: String(c.id),
  };
}

export function mapList(l: BrList): MigrateList {
  return {
    sourceId: String(l.id),
    name: l.name,
  };
}

export function mapTemplate(t: BrTemplate): MigrateTemplate {
  return {
    sourceId: String(t.id),
    name: t.name,
    subject: t.subject ?? "",
    bodyHtml: t.htmlContent ?? "",
  };
}

const REASON_MAP: Record<string, MigrateSuppression["reason"]> = {
  hardBounce: "bounce",
  softBounce: "bounce",
  unsubscribed: "unsubscribe",
  unsubscribedViaMA: "unsubscribe",
  unsubscribedViaEmail: "unsubscribe",
  unsubscribedUser: "unsubscribe",
  adminBlocked: "manual",
  contactBlocked: "manual",
  contactFlagged: "manual",
};

export function mapSuppression(b: BrBlockedContact): MigrateSuppression {
  return {
    email: b.email,
    reason: REASON_MAP[b.reason.code] ?? "manual",
    source: "brevo",
  };
}

export function mapDomain(d: BrDomain): MigrateDomain {
  return {
    domain: d.domain_name ?? d.domain ?? "",
    verified: d.authenticated,
  };
}

export function mapSender(s: BrSender): MigrateSender {
  return {
    email: s.email,
    name: s.name || undefined,
  };
}

export function mapCampaign(c: BrCampaign): MigrateCampaign {
  return {
    sourceId: String(c.id),
    name: c.name,
    subject: c.subject ?? "",
    bodyHtml: c.htmlContent ?? "",
    senderEmail: c.sender?.email,
  };
}
