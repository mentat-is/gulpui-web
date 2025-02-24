import { Event, Info, Internal } from '@/class/Info';
import { ΞEvent } from '@/dto/ChunkEvent.dto';
import { Logger } from '@/dto/Logger.class';
import { toast } from 'sonner';

export class AppSocket extends WebSocket {
  static instance: AppSocket | null = null;
  info!: Info;

  constructor(info: Info) {
    if (AppSocket.instance) {
      AppSocket.instance.info = info;
      return AppSocket.instance;
    }

    super(Internal.Settings.server + '/ws');

    this.info = info;
    AppSocket.instance = this;

    this.onopen = () => {
      Logger.log(`WebSocket has been initialized with id: ${this.info.app.general.ws_id}`, AppSocket.name, {
        toast: true
      });
      this.send(JSON.stringify({
        token: this.info.app.general.token,
        ws_id: this.info.app.general.ws_id,
      }));
    };

    this.onmessage = ({ data }) => {
      const message = JSON.parse(data);

      const { data: chunk } = message;

      switch (true) {
        case message.type === 'docs_chunk':
          const rawEvents: ΞEvent[] = chunk.docs;
          const events = Event.parse(rawEvents);
          this.info.events_add(events);
          return;

        case message.type === 'ingest_source_done':
          info.sync().then(() => {
            info.request_finish(message.data.req_id, 'done');
          });
          return;

        case message.type === 'enrich_done':
          toast(message.data.status === 'failed' ? 'Enrichment went wrong' : 'Enrichment done', {
            description: `Total processed documents: ${message.data.total_hits ?? 0}`
          });
          return;

        case message.type === 'query_done':
          if (message.data.status === 'done') {
            toast('Query finished', {
              description: `Total processed documents: ${message.data.total_hits ?? 0}`
            });
            this.info.request_finish(message.req_id, message.data.status)
          } else {
            toast.error('Query failed', {
              description: message.data.error ?? 'Unknown error',
              richColors: true
            });
            this.info.request_finish(message.req_id, message.data.status);
          }
          return;
      }
    }

    this.onerror = (error) => {
      Logger.error(`WebSocket error: ${typeof error === 'object' ? JSON.stringify(error, null, 2) : error}`, AppSocket.name, {
        toast: true
      });
      AppSocket.instance = null;
    };

    this.onclose = (event) => {
      Logger.error(`WebSocket has been closed. Reason: ${typeof event === 'object' ? JSON.stringify(event, null, 2) : event}`, AppSocket.name, {
        toast: true
      });
      AppSocket.instance = null;
    };
  }
}
