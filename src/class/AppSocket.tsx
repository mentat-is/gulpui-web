import { Event, Info, μ } from '@/class/Info';
import { λApp } from '@/dto';
import { ΞEvent } from '@/dto/ChunkEvent.dto';
import { Logger } from '@/dto/Logger.class';

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

    super(app.general.server + '/ws');

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
      const { data: chunk } = JSON.parse(data);

      this.info.setDownstream(new Blob([data]).size);

      switch (true) {
        case isQuery(chunk):
          const rawEvents: ΞEvent[] = chunk.docs;
          const events = Event.parse(rawEvents);
          return this.info.events_add(events);
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