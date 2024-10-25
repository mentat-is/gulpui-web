import { RawPlugin } from './Plugin.dto';
import { μ } from '@/class/Info';

export interface λContext {
  operation: NameId;
  plugins: μ.Plugin[],
  name: string,
  doc_count: number,
  selected?: boolean
  uuid: μ.Context
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
