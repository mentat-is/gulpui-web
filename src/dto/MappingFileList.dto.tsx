export interface λMapping {
  filename: string;
  mapping_ids: string[];
}

export interface RawMapping extends λMapping {
  metadata: {
    plugin: [string]
  }
}

export type MappingFileListRequest = RawMapping[];