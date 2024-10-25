import { RawFile } from './File.dto';
import { ResponseBase } from './ResponseBase.dto';
import { λMapping } from './MappingFileList.dto';
import { μ } from '@/class/Info';

export interface λPlugin {
  name: string,
  context: string
  files: string[],
  selected?: boolean;
  _uuid: μ.Context,
  uuid: μ.Plugin
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
  mappings: λMapping[];
};

export type PluginEntityType = 'ingestion' | 'sigma' | 'extension'

export interface PluginEntityOption {
  name: string,
  type: string,
  default: boolean,
  desc: string
}