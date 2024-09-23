import { UUID } from 'crypto';
import { RawFile } from './File.dto';
import { ResponseBase } from './ResponseBase.dto';

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
  depends_on: unknown[];
  desc: string;
  event_type_field: string;
  filename: string;
  internal: boolean;
  name: string;
  options: PluginEntityOption[];
  tags: string[];
  type: PluginEntityType;
  version: string;
};

export type PluginEntityType = 'ingestion' | 'sigma' | 'extension'

export interface PluginEntityOption {
  name: string,
  type: string,
  default: string,
  desc: string
}