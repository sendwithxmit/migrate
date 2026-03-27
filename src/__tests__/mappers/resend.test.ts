import { describe, it, expect } from "vitest";
import {
  mapContact,
  mapList,
  mapDomain,
  mapCampaign,
} from "../../providers/resend/mappers.js";

describe("Resend mappers", () => {
  describe("mapContact", () => {
    it("maps a contact", () => {
      const result = mapContact({
        id: "rs-1",
        email: "alice@test.com",
        first_name: "Alice",
        last_name: "Smith",
        unsubscribed: false,
      });

      expect(result).toEqual({
        email: "alice@test.com",
        firstName: "Alice",
        lastName: "Smith",
        sourceId: "rs-1",
      });
    });

    it("handles missing name fields", () => {
      const result = mapContact({
        id: "rs-2",
        email: "bob@test.com",
        unsubscribed: false,
      });

      expect(result.email).toBe("bob@test.com");
      expect(result.firstName).toBeUndefined();
    });
  });

  describe("mapList", () => {
    it("maps an audience", () => {
      const result = mapList({
        id: "aud-1",
        name: "Newsletter",
        created_at: "2024-01-01",
      });

      expect(result).toEqual({
        sourceId: "aud-1",
        name: "Newsletter",
      });
    });
  });

  describe("mapDomain", () => {
    it("maps a verified domain", () => {
      const result = mapDomain({
        id: "dom-1",
        name: "test.com",
        status: "verified",
      });

      expect(result).toEqual({
        domain: "test.com",
        sourceId: "dom-1",
        verified: true,
      });
    });

    it("maps an unverified domain", () => {
      const result = mapDomain({
        id: "dom-2",
        name: "pending.com",
        status: "pending",
      });

      expect(result.verified).toBe(false);
    });
  });

  describe("mapCampaign", () => {
    it("maps a broadcast", () => {
      const result = mapCampaign({
        id: "bc-1",
        name: "Launch Email",
        subject: "We launched!",
        from: "team@test.com",
        html: "<p>Big news</p>",
      });

      expect(result).toEqual({
        sourceId: "bc-1",
        name: "Launch Email",
        subject: "We launched!",
        bodyHtml: "<p>Big news</p>",
        senderEmail: "team@test.com",
      });
    });
  });
});
