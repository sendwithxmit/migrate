export interface RsAudience {
  id: string;
  name: string;
  created_at: string;
}

export interface RsContact {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  unsubscribed: boolean;
}

export interface RsDomain {
  id: string;
  name: string;
  status: "verified" | "pending" | "not_started" | "failed" | "temporary_failure";
}

export interface RsBroadcast {
  id: string;
  name: string;
  subject: string;
  from: string;
  html?: string;
  status: string;
}

export interface RsListResponse<T> {
  data: T[];
}
