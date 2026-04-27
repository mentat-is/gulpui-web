import { Filter } from "./Filter"

export namespace Query {
  export interface Type {
    string: string
    text_filter?: string
    filters: Filter.Type[]
    raw?: any
    isManual?: boolean
    source_config?: {
      operation_id: string;
      source_ids: string[];
      range: { min: number | string; max: number | string };
    }
  }
}
