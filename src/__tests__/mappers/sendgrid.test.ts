import { describe, it, expect } from "vitest";
import {
  mapContact,
  mapList,
  mapTemplate,
  mapSuppression,
  mapDomain,
  mapSender,
  mapCampaign,
} from "../../providers/sendgrid/mappers.js";

describe("SendGrid mappers", () => {
  describe("mapContact", () => {
    it("maps a contact with standard fields", () => {
      const result = mapContact({
        id: "sg-1",
        email: "alice@test.com",
        first_name: "Alice",
        last_name: "Smith",
        custom_fields: { company: "Acme" },
      });

      expect(result).toEqual({
        email: "alice@test.com",
        firstName: "Alice",
        lastName: "Smith",
        metadata: { company: "Acme" },
        sourceId: "sg-1",
      });
    });

    it("handles missing optional fields", () => {
      const result = mapContact({
        id: "sg-2",
        email: "bob@test.com",
      });

      expect(result.email).toBe("bob@test.com");
      expect(result.firstName).toBeUndefined();
      expect(result.lastName).toBeUndefined();
    });
  });

  describe("mapList", () => {
    it("maps a list", () => {
      const result = mapList({
        id: "list-1",
        name: "Newsletter",
        contact_count: 100,
      });

      expect(result).toEqual({
        sourceId: "list-1",
        name: "Newsletter",
      });
    });
  });

  describe("mapTemplate", () => {
    it("maps a template with version", () => {
      const result = mapTemplate({
        id: "tmpl-1",
        name: "Welcome",
        versions: [
          {
            subject: "Welcome!",
            html_content: "<p>Hello</p>",
            plain_content: "Hello",
            active: 1,
          },
        ],
      });

      expect(result).toEqual({
        sourceId: "tmpl-1",
        name: "Welcome",
        subject: "Welcome!",
        bodyHtml: "<p>Hello</p>",
        bodyText: "Hello",
      });
    });
  });

  describe("mapSuppression", () => {
    it("maps bounce", () => {
      const result = mapSuppression(
        { email: "bounce@test.com", created: 1234567890 },
        "bounce",
      );
      expect(result).toEqual({
        email: "bounce@test.com",
        reason: "bounce",
        source: "sendgrid",
      });
    });

    it("maps complaint", () => {
      const result = mapSuppression(
        { email: "spam@test.com", created: 1234567890 },
        "complaint",
      );
      expect(result.reason).toBe("complaint");
    });

    it("maps unsubscribe", () => {
      const result = mapSuppression(
        { email: "unsub@test.com", created: 1234567890 },
        "unsubscribe",
      );
      expect(result.reason).toBe("unsubscribe");
    });
  });

  describe("mapDomain", () => {
    it("maps a whitelabel domain", () => {
      const result = mapDomain({
        id: 1,
        domain: "test.com",
        valid: true,
      });

      expect(result).toEqual({
        domain: "test.com",
        sourceId: "1",
        verified: true,
      });
    });
  });

  describe("mapSender", () => {
    it("maps a verified sender", () => {
      const result = mapSender({
        id: 1,
        from_email: "hello@test.com",
        from_name: "Hello Team",
        reply_to: "reply@test.com",
      });

      expect(result).toEqual({
        email: "hello@test.com",
        name: "Hello Team",
        replyTo: "reply@test.com",
      });
    });
  });

  describe("mapCampaign", () => {
    it("maps a single send", () => {
      const result = mapCampaign({
        id: "camp-1",
        name: "Launch Email",
        email_config: {
          subject: "We launched!",
          html_content: "<p>Big news</p>",
          sender_id: 1,
        },
      });

      expect(result).toEqual({
        sourceId: "camp-1",
        name: "Launch Email",
        subject: "We launched!",
        bodyHtml: "<p>Big news</p>",
      });
    });
  });
});
