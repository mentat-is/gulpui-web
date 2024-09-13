import { ResponseBase } from "./ResponseBase.dto";

interface Event {
  "@timestamp": number;
  "_id": string;
}

interface QueryResult {
  events: Event[];
  aggregations: null; // Assuming the type is null, replace with the correct type if needed
  total_hits: number;
  search_after: [number, string];
  query_glyph_id: null | string; // Adjust based on actual data
  error: null | string; // Adjust based on actual data
  sigma_rule_file: null | string; // Adjust based on actual data
  sigma_rule_id: null | string; // Adjust based on actual data
  stored_query_id: null | string; // Adjust based on actual data
  query_dsl: null | string; // Adjust based on actual data
  query_name: string;
}

export type QueryGulp = ResponseBase<{
  id: null;
  type: number;
  req_id: string;
  operation_id: null;
  client_id: null;
  context: null;
  status: number;
  time_created: number;
  time_expire: number;
  time_update: number;
  time_end: number;
  ev_failed: number;
  ev_skipped: number;
  ev_processed: number;
  files_processed: number;
  files_total: number;
  queries_total: number;
  sigma_group_results: null; // Assuming the type is null, replace with the correct type if needed
  query_results: QueryResult[];
  live: boolean;
  matched_events_total: number;
  ingest_errors: null | string; // Adjust based on actual data
  current_src_file: null | string; // Adjust based on actual data
}>;
