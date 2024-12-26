import { Info, μ } from '@/class/Info';
import { λApp } from '@/dto';
import { AppSocketResponse, AppSocketResponseData } from '@/dto/AppSocket.dto';
import { Chunk, isChunkDefault, UnknownChunk, λChunk } from '@/dto/Chunk.dto';
import { λEvent, RawChunkEvent } from '@/dto/ChunkEvent.dto';
import { Logger } from '@/dto/Logger.class';
import { Hardcode } from './Engine.dto';
import { λFile } from '@/dto/Operation.dto';

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

    this.onmessage = ({ data }: AppSocketResponse) => {
      const { data: _chunk } = JSON.parse(data) as AppSocketResponseData;
      this.info.setDownstream(new Blob([data]).size);

      if (isChunkDefault(_chunk)) {
        const events: Chunk['events'] = _chunk.events.map((event: RawChunkEvent): λEvent => ({
          _id: event._id,
          // @ts-ignore
          operation_id: event.operation_id,
          timestamp: event['@timestamp'] as Hardcode.Timestamp,
          event: {
            code: event['gulp.event.code'],
            duration: event['event.duration']
          },
          file: event['gulp.file.file'],
          // @ts-ignore
          context: event['gulp.context'],
        }));

        this.info.events_add(events);
      } else if ((_chunk as UnknownChunk).type === λChunk.QUERY_RESULT && _chunk.matches_total > 0) {
        this.info.setLoaded([...this.info.app.timeline.loaded, _chunk.req_id as λFile['id']]);
      } else if ('collabs' in _chunk) {
        this.info.notes_reload();
        this.info.links_reload();
      } else {
        Logger.warn(`WebSocket recived unknown type of chunk: ${JSON.stringify(_chunk, null, 2)}`, AppSocket.name); 
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