export interface McList {
  id: string;
  name: string;
  stats: {
    member_count: number;
    unsubscribe_count: number;
    cleaned_count: number;
  };
}

export interface McListsResponse {
  lists: McList[];
  total_items: number;
}

export interface McMember {
  id: string;
  email_address: string;
  merge_fields: Record<string, string>;
  status: "subscribed" | "unsubscribed" | "cleaned" | "pending" | "transactional";
}

export interface McMembersResponse {
  members: McMember[];
  total_items: number;
}

export interface McTemplate {
  id: number;
  name: string;
  type: string;
}

export interface McTemplatesResponse {
  templates: McTemplate[];
  total_items: number;
}

export interface McCampaign {
  id: string;
  type: string;
  settings: {
    title: string;
    subject_line: string;
    from_name: string;
    reply_to: string;
  };
}

export interface McCampaignsResponse {
  campaigns: McCampaign[];
  total_items: number;
}

export interface McCampaignContent {
  html: string;
  plain_text?: string;
}

export interface McVerifiedDomain {
  domain: string;
  verified: boolean;
}
