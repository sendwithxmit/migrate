/**
 * Converts provider-specific template variable syntax to Transmit's {{var}} format.
 */

const STANDARD_FIELD_MAP: Record<string, string> = {
  fname: "firstName",
  firstname: "firstName",
  first_name: "firstName",
  lname: "lastName",
  lastname: "lastName",
  last_name: "lastName",
  email_address: "email",
  emailaddress: "email",
  unsub: "unsubscribe_url",
  unsubscribe: "unsubscribe_url",
  unsubscribe_link: "unsubscribe_url",
};

function normalizeFieldName(field: string): string {
  const lower = field.toLowerCase().trim();
  return STANDARD_FIELD_MAP[lower] ?? lower;
}

export interface ConversionResult {
  html: string;
  variables: string[];
}

// ── SendGrid ──
// {{{var}}} (unescaped) or {{var}} (escaped)
function convertSendGrid(html: string): ConversionResult {
  const variables = new Set<string>();

  // Triple braces first (unescaped), then double
  let result = html.replace(/\{\{\{(\s*[\w.]+\s*)\}\}\}/g, (_, name) => {
    const normalized = normalizeFieldName(name.trim());
    variables.add(normalized);
    return `{{${normalized}}}`;
  });

  result = result.replace(/\{\{(\s*[\w.]+\s*)\}\}/g, (_, name) => {
    const normalized = normalizeFieldName(name.trim());
    variables.add(normalized);
    return `{{${normalized}}}`;
  });

  return { html: result, variables: [...variables] };
}

// ── Mailchimp ──
// *|TAG|* format
function convertMailchimp(html: string): ConversionResult {
  const variables = new Set<string>();

  const result = html.replace(/\*\|(\w+)\|\*/g, (_, tag) => {
    const normalized = normalizeFieldName(tag.trim());
    variables.add(normalized);
    return `{{${normalized}}}`;
  });

  return { html: result, variables: [...variables] };
}

// ── Brevo ──
// {{ contact.ATTR }} and {{ params.VAR }}
function convertBrevo(html: string): ConversionResult {
  const variables = new Set<string>();

  const result = html.replace(
    /\{\{\s*(?:contact|params)\.(\w+)\s*\}\}/g,
    (_, attr) => {
      const normalized = normalizeFieldName(attr.trim());
      variables.add(normalized);
      return `{{${normalized}}}`;
    },
  );

  return { html: result, variables: [...variables] };
}

// ── Resend ──
// Already {{var}} format, just normalize field names
function convertResend(html: string): ConversionResult {
  const variables = new Set<string>();

  const result = html.replace(/\{\{(\s*[\w.]+\s*)\}\}/g, (_, name) => {
    const normalized = normalizeFieldName(name.trim());
    variables.add(normalized);
    return `{{${normalized}}}`;
  });

  return { html: result, variables: [...variables] };
}

const converters: Record<string, (html: string) => ConversionResult> = {
  sendgrid: convertSendGrid,
  mailchimp: convertMailchimp,
  brevo: convertBrevo,
  resend: convertResend,
};

export function convertVariables(
  provider: string,
  html: string,
): ConversionResult {
  const converter = converters[provider];
  if (!converter) {
    throw new Error(`No variable converter for provider: ${provider}`);
  }
  return converter(html);
}
