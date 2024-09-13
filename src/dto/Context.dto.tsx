import { UUID } from 'crypto';
import { λPlugin, RawPlugin } from './Plugin.dto';

export interface λContext {
  operation: NameId;
  plugins: string[],
  name: string,
  doc_count: number,
  selected?: boolean
  uuid: UUID
}

export interface RawContext {
  name: string,
  doc_count: number,
  plugins: RawPlugin[]
}

export interface NameId {
  name: string;
  id: number
}
