export interface SgContact {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  custom_fields?: Record<string, unknown>;
}

export interface SgList {
  id: string;
  name: string;
  contact_count: number;
  _metadata?: { next?: string };
}

export interface SgListsResponse {
  result: SgList[];
  _metadata?: { next?: string };
}

export interface SgTemplateVersion {
  subject: string;
  html_content: string;
  plain_content?: string;
  active: number;
}

export interface SgTemplate {
  id: string;
  name: string;
  versions: SgTemplateVersion[];
}

export interface SgTemplatesResponse {
  result: SgTemplate[];
  _metadata?: { next?: string };
}

export interface SgSuppression {
  email: string;
  created: number;
  reason?: string;
  status?: string;
}

export interface SgDomain {
  id: number;
  domain: string;
  valid: boolean;
}

export interface SgSender {
  id: number;
  from_email: string;
  from_name?: string;
  reply_to?: string;
}

export interface SgSingleSend {
  id: string;
  name: string;
  status: string;
  email_config: {
    subject: string;
    html_content: string;
    sender_id?: number;
  };
}

export interface SgExportResponse {
  id: string;
  status: string;
  urls?: string[];
}

export interface SgContactExportResult {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  [key: string]: unknown;
}
