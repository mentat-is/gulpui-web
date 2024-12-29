import { JsonString } from '@/ui/utils';
import { UnknownRawChunk } from './Chunk.dto';


export interface AppSocketResponse extends MessageEvent {
  data: JsonString<AppSocketResponseData>
}

export interface AppSocketResponseData  {
  req_id: string;
  timestamp: number;
  type: number;
  data: UnknownRawChunk;
  username: string | null;
  ws_id: string;
}
