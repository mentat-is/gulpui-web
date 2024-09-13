import { ResponseBase } from "./ResponseBase.dto";

export interface MappingFile {
  filename: string;
  mapping_ids: string[];
  metadata: {
    plugin: [string]
  }
}

export type MappingFileListRequest = ResponseBase<MappingFile[]> 