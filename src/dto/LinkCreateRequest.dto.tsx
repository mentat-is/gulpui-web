import { λEvent } from './ChunkEvent.dto';
import { Arrayed } from '@/class/Info';
import { λLink } from './Dataset';

interface LinkCreateRequestProps {
  name: λLink['name'];
  description: λLink['description'];
  events: Arrayed<λEvent>;
}

export class LinkCreateRequest {
  public static body = ({ name, events, description }: LinkCreateRequestProps): '' => ''
}