import { describe, it, expect } from "vitest";
import {
  mapContact,
  mapList,
  mapTemplate,
  mapSuppression,
  mapDomain,
  mapSender,
  mapCampaign,
} from "../../providers/brevo/mappers.js";

describe("Brevo mappers", () => {
  describe("mapContact", () => {
    it("maps a contact with attributes", () => {
      const result = mapContact({
        id: 1,
        email: "alice@test.com",
        attributes: {
          FIRSTNAME: "Alice",
          LASTNAME: "Smith",
          COMPANY: "Acme",
        },
        listIds: [1, 2],
      });

      expect(result).toEqual({
        email: "alice@test.com",
        firstName: "Alice",
        lastName: "Smith",
        metadata: { COMPANY: "Acme" },
        sourceId: "1",
      });
    });

    it("handles missing attributes", () => {
      const result = mapContact({
        id: 2,
        email: "bob@test.com",
        attributes: {},
        listIds: [],
      });

      expect(result.email).toBe("bob@test.com");
      expect(result.firstName).toBeUndefined();
      expect(result.lastName).toBeUndefined();
    });
  });

  describe("mapList", () => {
    it("maps a list", () => {
      const result = mapList({
        id: 1,
        name: "Newsletter",
        totalSubscribers: 500,
      });

      expect(result).toEqual({
        sourceId: "1",
        name: "Newsletter",
      });
    });
  });

  describe("mapTemplate", () => {
    it("maps a template", () => {
      const result = mapTemplate({
        id: 1,
        name: "Welcome",
        subject: "Welcome!",
        htmlContent: "<p>Hello {{ contact.FIRSTNAME }}</p>",
      });

      expect(result).toEqual({
        sourceId: "1",
        name: "Welcome",
        subject: "Welcome!",
        bodyHtml: "<p>Hello {{ contact.FIRSTNAME }}</p>",
      });
    });
  });

  describe("mapSuppression", () => {
    it("maps hardBounce", () => {
      const result = mapSuppression({
        email: "bounce@test.com",
        reason: { code: "hardBounce", message: "Unknown address" },
      });
      expect(result).toEqual({
        email: "bounce@test.com",
        reason: "bounce",
        source: "brevo",
      });
    });

    it("maps unsubscribed", () => {
      const result = mapSuppression({
        email: "unsub@test.com",
        reason: { code: "unsubscribed", message: "User unsubscribed" },
      });
      expect(result.reason).toBe("unsubscribe");
    });

    it("maps unsubscribedViaEmail", () => {
      const result = mapSuppression({
        email: "unsub2@test.com",
        reason: { code: "unsubscribedViaEmail", message: "Clicked unsubscribe" },
      });
      expect(result.reason).toBe("unsubscribe");
    });

    it("maps adminBlocked as manual", () => {
      const result = mapSuppression({
        email: "blocked@test.com",
        reason: { code: "adminBlocked", message: "Admin blocked" },
      });
      expect(result.reason).toBe("manual");
    });

    it("maps unknown codes to manual", () => {
      const result = mapSuppression({
        email: "unknown@test.com",
        reason: { code: "someNewCode", message: "Unknown" },
      });
      expect(result.reason).toBe("manual");
    });
  });

  describe("mapDomain", () => {
    it("maps a domain with domain field", () => {
      const result = mapDomain({
        domain: "test.com",
        authenticated: true,
      });
      expect(result).toEqual({
        domain: "test.com",
        verified: true,
      });
    });

    it("maps a domain with domain_name field", () => {
      const result = mapDomain({
        domain_name: "test.com",
        authenticated: true,
      });
      expect(result).toEqual({
        domain: "test.com",
        verified: true,
      });
    });
  });

  describe("mapSender", () => {
    it("maps a sender", () => {
      const result = mapSender({
        id: 1,
        name: "Hello Team",
        email: "hello@test.com",
      });
      expect(result).toEqual({
        email: "hello@test.com",
        name: "Hello Team",
      });
    });
  });

  describe("mapCampaign", () => {
    it("maps a campaign", () => {
      const result = mapCampaign({
        id: 1,
        name: "Launch",
        subject: "We launched!",
        htmlContent: "<p>Big news</p>",
        sender: { email: "hello@test.com", name: "Team" },
      });

      expect(result).toEqual({
        sourceId: "1",
        name: "Launch",
        subject: "We launched!",
        bodyHtml: "<p>Big news</p>",
        senderEmail: "hello@test.com",
      });
    });
  });
});
