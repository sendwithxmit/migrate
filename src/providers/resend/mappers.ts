import type {
  MigrateContact,
  MigrateList,
  MigrateDomain,
  MigrateCampaign,
} from "../../types.js";
import type { RsContact, RsAudience, RsDomain, RsBroadcast } from "./types.js";

export function mapContact(c: RsContact): MigrateContact {
  return {
    email: c.email,
    firstName: c.first_name || undefined,
    lastName: c.last_name || undefined,
    sourceId: c.id,
  };
}

export function mapList(a: RsAudience): MigrateList {
  return {
    sourceId: a.id,
    name: a.name,
  };
}

export function mapDomain(d: RsDomain): MigrateDomain {
  return {
    domain: d.name,
    sourceId: d.id,
    verified: d.status === "verified",
  };
}

export function mapCampaign(b: RsBroadcast): MigrateCampaign {
  return {
    sourceId: b.id,
    name: b.name,
    subject: b.subject ?? "",
    bodyHtml: b.html ?? "",
    senderEmail: b.from || undefined,
  };
}
