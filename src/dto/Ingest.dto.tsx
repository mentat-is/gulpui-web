export type IngestMapping = IngestCluster[]

export interface IngestCluster {
  plugin: string;
  types: IngestNode[]
};

export interface IngestNode {
  filename: string
  ids: string[]
};
