import { ResponseBase } from "./ResponseBase.dto";

export interface Bucket {
  total: number;
  fetched: number;
  event_code: MinMax;
  timestamp: MinMax;
  selected: MinMax | null;
}

export interface MinMax {
  min: number;
  max: number
}

export const MinMaxBase = {
  min: 0,
  max: 0
}