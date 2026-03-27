import { describe, it, expect } from "vitest";
import { convertVariables } from "../transformers/variable-converter.js";

describe("variable-converter", () => {
  describe("SendGrid", () => {
    it("converts double-brace variables", () => {
      const result = convertVariables("sendgrid", "Hello {{first_name}}!");
      expect(result.html).toBe("Hello {{firstName}}!");
      expect(result.variables).toContain("firstName");
    });

    it("converts triple-brace (unescaped) variables", () => {
      const result = convertVariables(
        "sendgrid",
        "Hello {{{first_name}}}!",
      );
      expect(result.html).toBe("Hello {{firstName}}!");
      expect(result.variables).toContain("firstName");
    });

    it("normalizes standard fields", () => {
      const result = convertVariables(
        "sendgrid",
        "{{fname}} {{lname}} {{email_address}}",
      );
      expect(result.html).toBe("{{firstName}} {{lastName}} {{email}}");
      expect(result.variables).toEqual(
        expect.arrayContaining(["firstName", "lastName", "email"]),
      );
    });

    it("preserves custom variables", () => {
      const result = convertVariables(
        "sendgrid",
        "Hello {{company_name}}",
      );
      expect(result.html).toBe("Hello {{company_name}}");
      expect(result.variables).toContain("company_name");
    });

    it("deduplicates variables", () => {
      const result = convertVariables(
        "sendgrid",
        "{{fname}} and {{fname}}",
      );
      expect(result.variables).toEqual(["firstName"]);
    });
  });

  describe("Mailchimp", () => {
    it("converts *|TAG|* syntax", () => {
      const result = convertVariables(
        "mailchimp",
        "Hello *|FNAME|* *|LNAME|*!",
      );
      expect(result.html).toBe("Hello {{firstName}} {{lastName}}!");
    });

    it("normalizes common merge tags", () => {
      const result = convertVariables(
        "mailchimp",
        "*|FNAME|* (*|EMAIL|*) - *|UNSUB|*",
      );
      expect(result.html).toBe(
        "{{firstName}} ({{email}}) - {{unsubscribe_url}}",
      );
    });

    it("converts custom tags to lowercase", () => {
      const result = convertVariables(
        "mailchimp",
        "*|COMPANY|*",
      );
      expect(result.html).toBe("{{company}}");
    });
  });

  describe("Brevo", () => {
    it("converts contact.ATTR syntax", () => {
      const result = convertVariables(
        "brevo",
        "Hello {{ contact.FIRSTNAME }} {{ contact.LASTNAME }}!",
      );
      expect(result.html).toBe("Hello {{firstName}} {{lastName}}!");
    });

    it("converts params.VAR syntax", () => {
      const result = convertVariables(
        "brevo",
        "Order #{{ params.ORDER_ID }}",
      );
      expect(result.html).toBe("Order #{{order_id}}");
    });

    it("handles mixed contact and params", () => {
      const result = convertVariables(
        "brevo",
        "Hi {{ contact.FIRSTNAME }}, your code is {{ params.CODE }}",
      );
      expect(result.html).toBe("Hi {{firstName}}, your code is {{code}}");
      expect(result.variables).toEqual(
        expect.arrayContaining(["firstName", "code"]),
      );
    });
  });

  describe("Resend", () => {
    it("passes through {{var}} with normalization", () => {
      const result = convertVariables(
        "resend",
        "Hello {{first_name}}!",
      );
      expect(result.html).toBe("Hello {{firstName}}!");
    });

    it("passes through already-normalized variables", () => {
      const result = convertVariables(
        "resend",
        "Hello {{firstName}}!",
      );
      expect(result.html).toBe("Hello {{firstName}}!");
    });
  });

  describe("error handling", () => {
    it("throws for unknown provider", () => {
      expect(() => convertVariables("unknown", "test")).toThrow(
        "No variable converter for provider: unknown",
      );
    });
  });
});
