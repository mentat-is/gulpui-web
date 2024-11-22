import { ResponseBase } from "./ResponseBase.dto";

export interface Bucket {
  total: number;
  fetched: number;
  event_code: MinMax;
  timestamp: MinMax;
  selected: MinMax | null;
}

export type QueryMaxMin = ResponseBase<{
  buckets: [
    {
      '*': {
        doc_count: number,
        'max_event.code': number,
        'min_event.code': number,
        'max_@timestamp': number,
        'min_@timestamp': number,
      }
    }
  ],
  total: number;
}>;

export interface MinMax {
  min: number;
  max: number
}

export const MinMaxBase = {
  min: 0,
  max: 0
}