import { ResponseBase } from "./ResponseBase.dto";

export interface Mapping {
  filename: string;
  mapping_ids: string[];
}

export interface RawMapping extends Mapping {
  metadata: {
    plugin: [string]
  }
}

export type MappingFileListRequest = ResponseBase<RawMapping[]> 