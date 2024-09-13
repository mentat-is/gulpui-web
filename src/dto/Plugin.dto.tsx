import { UUID } from 'crypto';
import { NameId } from './Context.dto';
import { λFile, RawFile } from './File.dto';

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