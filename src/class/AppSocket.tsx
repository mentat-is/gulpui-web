import { Event, Info, Internal } from '@/class/Info';
import { λApp } from '@/dto';
import { ΞEvent } from '@/dto/ChunkEvent.dto';
import { Logger } from '@/dto/Logger.class';
import { toast } from 'sonner';

export class AppSocket extends WebSocket {
  private static instance: AppSocket | null = null;
  info!: Info;
  app!: λApp;

  constructor(info: Info, app: λApp) {
    if (AppSocket.instance) {
      AppSocket.instance.info = info;
      AppSocket.instance.app = app;
      return AppSocket.instance;
    }

    super(Internal.Settings.server + '/ws');

    this.info = info;
    this.app = app;
    AppSocket.instance = this;

    this.onopen = (ev) => {
      Logger.log(`WebSocket has been initialized with id: ${this.info.app.general.ws_id}`, AppSocket.name);
      this.send(JSON.stringify({
        token: this.info.app.general.token,
        ws_id: this.info.app.general.ws_id,
      }));
    };

    this.onmessage = ({ data }) => {
      const message = JSON.parse(data);

      const { data: chunk } = message;

      switch (true) {
        case isQuery(chunk):
          const rawEvents: ΞEvent[] = chunk.docs;
          const events = Event.parse(rawEvents);
          this.info.events_add(events);
          return

        case message.type === 'stats_update':
          const context_id = message.data.data['gulp.context_id'];
          const source_id = message.data.data['gulp.source_id'];

          if (context_id && !this.info.app.target.contexts.find(c => c.id === context_id)) {
            Logger.log(`New context ${context_id}. Do sync: ${new Date(Date.now()).toISOString()}`, AppSocket.name);
            Logger.error(this.info.app.target.contexts.map(c => c.id), AppSocket.name);
            info.sync();
            return;
          } else if (source_id && !this.info.app.target.files.find(c => c.id === source_id)) {
            Logger.log(`New file ${source_id}. Do sync: ${new Date(Date.now()).toISOString()}`, AppSocket.name);
            info.sync();
          }
          return;

        case message.type === 'ingest_source_done':
          info.sync().then(() => this.info.end_ingesting(message.data.req_id));          
          return;

        case message.type === 'enrich_done':
          toast(message.data.status === 'failed' ? 'Enrichment went wrong' : 'Enrichment done', {
            description: `Total processed documents: ${message.data.total_hits ?? 0}`
          });
          return;
      }
    }

    this.onerror = (error) => {
      Logger.error(`WebSocket error: ${typeof error === 'object' ? JSON.stringify(error, null, 2) : error}`, AppSocket.name);
      AppSocket.instance = null;
    };

    this.onclose = (event) => {
      Logger.error(`WebSocket has been closed. Reason: ${typeof event === 'object' ? JSON.stringify(event, null, 2) : event}`, AppSocket.name);
      AppSocket.instance = null;
    };
  }
}

function isQuery(chunk: any): boolean {
  return typeof chunk.chunk_number === 'number' && Array.isArray(chunk.docs) && typeof chunk.name === 'string' && typeof chunk.total_hits === 'number';
}