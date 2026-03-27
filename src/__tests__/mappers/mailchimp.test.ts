import { describe, it, expect } from "vitest";
import {
  mapContact,
  mapList,
  mapTemplate,
  mapSuppression,
  mapDomain,
  mapCampaign,
} from "../../providers/mailchimp/mappers.js";

describe("Mailchimp mappers", () => {
  describe("mapContact", () => {
    it("maps a member with merge fields", () => {
      const result = mapContact({
        id: "mc-1",
        email_address: "alice@test.com",
        merge_fields: {
          FNAME: "Alice",
          LNAME: "Smith",
          COMPANY: "Acme",
        },
        status: "subscribed",
      });

      expect(result).toEqual({
        email: "alice@test.com",
        firstName: "Alice",
        lastName: "Smith",
        metadata: { COMPANY: "Acme" },
        sourceId: "mc-1",
      });
    });

    it("handles empty merge fields", () => {
      const result = mapContact({
        id: "mc-2",
        email_address: "bob@test.com",
        merge_fields: {},
        status: "subscribed",
      });

      expect(result.email).toBe("bob@test.com");
      expect(result.firstName).toBeUndefined();
      expect(result.lastName).toBeUndefined();
    });
  });

  describe("mapList", () => {
    it("maps an audience", () => {
      const result = mapList({
        id: "list-1",
        name: "Main Audience",
        stats: { member_count: 5000 },
      });

      expect(result).toEqual({
        sourceId: "list-1",
        name: "Main Audience",
      });
    });
  });

  describe("mapTemplate", () => {
    it("maps a template with content", () => {
      const result = mapTemplate(
        {
          id: 123,
          name: "Welcome Email",
          type: "user",
        },
        "<p>Welcome *|FNAME|*</p>",
      );

      expect(result).toEqual({
        sourceId: "123",
        name: "Welcome Email",
        subject: "",
        bodyHtml: "<p>Welcome *|FNAME|*</p>",
      });
    });
  });

  describe("mapSuppression", () => {
    it("maps unsubscribed member", () => {
      const result = mapSuppression({
        email_address: "unsub@test.com",
        status: "unsubscribed",
      });
      expect(result).toEqual({
        email: "unsub@test.com",
        reason: "unsubscribe",
        source: "mailchimp",
      });
    });

    it("maps cleaned member as bounce", () => {
      const result = mapSuppression({
        email_address: "cleaned@test.com",
        status: "cleaned",
      });
      expect(result.reason).toBe("bounce");
    });
  });

  describe("mapDomain", () => {
    it("maps a verified domain", () => {
      const result = mapDomain({
        domain: "test.com",
        verified: true,
      });
      expect(result).toEqual({
        domain: "test.com",
        verified: true,
      });
    });
  });

  describe("mapCampaign", () => {
    it("maps a campaign with content", () => {
      const result = mapCampaign(
        {
          id: "camp-1",
          settings: {
            title: "Weekly Update",
            subject_line: "This week at Acme",
            from_name: "Acme",
            reply_to: "reply@acme.com",
          },
          type: "regular",
        },
        "<p>Content here</p>",
      );

      expect(result).toEqual({
        sourceId: "camp-1",
        name: "Weekly Update",
        subject: "This week at Acme",
        bodyHtml: "<p>Content here</p>",
      });
    });
  });
});
