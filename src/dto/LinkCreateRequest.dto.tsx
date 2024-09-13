import { JsonString } from '@/ui/utils';
import { λEvent, λEventFormForCreateRequest } from './ChunkEvent.dto';
import { Arrayed, Event, Parser } from '@/class/Info';

interface LinkCreateRequestProps {
  description: string;
  events: Arrayed<λEvent>;
}

interface LinkCreateRequestFulfilled {
  description: string;
  events: λEventFormForCreateRequest[];
}

export class LinkCreateRequest {
  public static body = ({ events, description }: LinkCreateRequestProps): JsonString<LinkCreateRequestFulfilled> => JSON.stringify({
    description,
    events: Event.formatToCreateRequest(events)
  }) as JsonString<LinkCreateRequestFulfilled>;
}