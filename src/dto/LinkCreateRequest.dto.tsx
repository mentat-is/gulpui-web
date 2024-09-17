import { JsonString } from '@/ui/utils';
import { λEvent, λEventFormForCreateRequest } from './ChunkEvent.dto';
import { Arrayed, Event, Parser } from '@/class/Info';

interface LinkCreateRequestProps {
  name: string;
  description: string;
  events: Arrayed<λEvent>;
}

interface LinkCreateRequestFulfilled {
  name: string;
  description: string;
  events: λEventFormForCreateRequest[];
}

export class LinkCreateRequest {
  public static body = ({ name, events, description }: LinkCreateRequestProps): JsonString<LinkCreateRequestFulfilled> => JSON.stringify({
    name,
    description,
    events: Event.formatToCreateRequest(events)
  }) as JsonString<LinkCreateRequestFulfilled>;
}