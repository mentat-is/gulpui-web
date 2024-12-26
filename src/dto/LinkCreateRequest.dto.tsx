import { JsonString } from '@/ui/utils';
import { λEvent, λEventFormForCreateRequest } from './ChunkEvent.dto';
import { Arrayed, Event } from '@/class/Info';
import { λLink } from './Link.dto';

interface LinkCreateRequestProps {
  name: λLink['name'];
  description: λLink['description'];
  events: Arrayed<λEvent>;
}

interface LinkCreateRequestFulfilled {
  name: string;
  description: string;
  events: λEventFormForCreateRequest[];
}

export class LinkCreateRequest {
  public static body = ({ name, events, description }: LinkCreateRequestProps): '' => ''
}