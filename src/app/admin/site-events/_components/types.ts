export type SiteEventRow = {
  id: string;
  created_at: string; // timestamptz
  event_name: string;
  page_path: string | null;
  page_url: string | null;
  referrer: string | null;
  session_id: string | null;
  anon_id: string | null;

  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;

  traffic_type: string | null;
  keyword: string | null;
  device_type: string | null;
  user_agent: string | null;

  ip: string | null;
  country: string | null;
  region: string | null;
  city: string | null;

  // in your DB it's TEXT (stringified JSON) in the logs you pasted
  props: any;
};
