import { UUID } from "crypto"
import { User } from "./User"

export namespace Request {
  export const name = 'Request'
  const _ = Symbol(Request.name)
  export type Id = UUID & {
    readonly [_]: unique symbol
  }

  export interface Type {
    id: Request.Id;
    completed: string;
    granted_user_group_ids: User.Id[];
    granted_user_ids: User.Id[];
    name: string;
    owner_user_id: User.Id;
    records_failed: number;
    records_ingested: number;
    records_processed: number;
    records_skipped: number;
    source_failed: number;
    source_processed: number;
    source_total: number;
    status: Request.Status;
    time_created: number;
    time_expire: number;
    time_finished: number;
    time_updated: number;
    type: 'request_stats';
  }

  export enum Status {
    ONGOING = 'ongoing',
    DONE = 'done',
    FAILED = 'failed',
    CANCELED = 'canceled',
    PENDING = 'pending',
  }

  export enum Prefix {
    INGESTION = 'ingestion',
    QUERY = 'query',
    ENRICHMENT = 'enrichment'
  }
}