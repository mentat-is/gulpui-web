import { JsonString } from '@/ui/utils';
import { λEvent } from './ChunkEvent.dto';
import { Arrayed, Parser } from '@/class/Info';

interface NoteCreateRequestProps {
  text: string;
  title: string;
  tags: string[]
}

interface NoteCreateRequestFulfilled extends NoteCreateRequestProps {
  events: NoteCreateRequestBodyEventProps[]
} 

interface NoteCreateRequestBodyEventProps {
  id: string;
  timestamp: number;
  operation_id: number;
  context: string;
  src_file: string;
}

export class NoteCreateRequestBodyEvent {
  public static events = (events: Arrayed<λEvent>): NoteCreateRequestBodyEventProps[] => Parser.array(events).map(e => ({
    id: e._id,
    timestamp: e.timestamp,
    operation_id: e.operation_id,
    context: e.context,
    src_file: e.file
  }))
}

export class NoteCreateRequest {
  public static body = (body: NoteCreateRequestProps, events?: Arrayed<λEvent>): JsonString<NoteCreateRequestFulfilled> => JSON.stringify({
    ...body,
    events: events ? NoteCreateRequestBodyEvent.events(events) : undefined
  }) as JsonString<NoteCreateRequestFulfilled>;
}