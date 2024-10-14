import { UUID } from 'crypto';
import { RawFile } from './File.dto';
import { ResponseBase } from './ResponseBase.dto';
import { Mapping } from './MappingFileList.dto';

export interface λPlugin {
  name: string,
  context: string
  files: string[],
  selected?: boolean;
  _uuid: UUID
  uuid: UUID
}

export interface RawPlugin {
  name: string,
  src_file: RawFile[]
}

export type PluginEntityResponse = ResponseBase<PluginEntity[]>

export interface PluginEntity {
  display_name: string;
  type: PluginEntityType;
  paid: boolean;
  desc: string;
  filename: string;
  internal: boolean;
  options: PluginEntityOption[];
  depends_on: [];
  tags: string[];
  event_type_field: string;
  version: string;
  mappings: Mapping[];
};

export type PluginEntityType = 'ingestion' | 'sigma' | 'extension'

export interface PluginEntityOption {
  name: string,
  type: string,
  default: boolean,
  desc: string
}