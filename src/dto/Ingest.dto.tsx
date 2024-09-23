export type IngestMapping = IngestCluster[]

export interface IngestCluster {
  depends_on: unknown[];
  desc: string;
  event_type_field: string;
  filename: string;
  internal: boolean;
  name: string;
  options: IngestOption[];
  tags: string[];
  type: IngestType;
  version: string;
};

export type IngestType = 'ingestion' | 'sigma' | 'extension'

export interface IngestOption {
  name: string,
  type: string,
  default: string,
  desc: string
}