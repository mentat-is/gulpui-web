import { λMapping } from './MappingFileList.dto';

export interface λPlugin {
  display_name: string;
  type: λPluginType;
  paid: boolean;
  desc: string;
  filename: string;
  internal: boolean;
  options: λPluginOption[];
  depends_on: [];
  tags: string[];
  event_type_field: string;
  version: string;
  mappings: λMapping[];
};

export type λPluginType = 'ingestion' | 'sigma' | 'extension'

export interface λPluginOption {
  name: string,
  type: string,
  default: boolean,
  desc: string
}