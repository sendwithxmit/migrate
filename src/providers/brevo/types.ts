export interface BrContact {
  id: number;
  email: string;
  attributes: Record<string, unknown>;
  listIds: number[];
}

export interface BrContactsResponse {
  contacts: BrContact[];
  count: number;
}

export interface BrList {
  id: number;
  name: string;
  totalSubscribers: number;
}

export interface BrListsResponse {
  lists: BrList[];
  count: number;
}

export interface BrTemplate {
  id: number;
  name: string;
  subject: string;
  htmlContent: string;
}

export interface BrTemplatesResponse {
  templates: BrTemplate[];
  count: number;
}

export interface BrCampaign {
  id: number;
  name: string;
  subject: string;
  htmlContent: string;
  sender: { email: string; name: string };
}

export interface BrCampaignsResponse {
  campaigns: BrCampaign[];
  count: number;
}

export interface BrBlockedContact {
  email: string;
  reason: {
    code: string;
    message: string;
  };
}

export interface BrBlockedResponse {
  contacts: BrBlockedContact[];
  count: number;
}

export interface BrDomain {
  domain?: string;
  domain_name?: string;
  authenticated: boolean;
}

export interface BrSender {
  id: number;
  name: string;
  email: string;
}
