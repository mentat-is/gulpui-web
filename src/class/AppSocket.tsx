import { Info } from '@/class/Info';
import { Info as Information } from '@/dto';
import { AppSocketResponse, AppSocketResponseData } from '@/dto/AppSocket.dto';
import { Chunk, isChunkDefault } from '@/dto/Chunk.dto';
import { λEvent, RawChunkEvent } from '@/dto/ChunkEvent.dto';

export class AppSocket extends WebSocket {
  private static instance: AppSocket | null = null;
  info!: Info;
  app!: Information;

  constructor(info: Info, app: Information) {
    if (AppSocket.instance) {
      AppSocket.instance.info = info;
      AppSocket.instance.app = app;
      return AppSocket.instance;
    }

    if (!app.general.server)
      console.error('Expected URL in app.general.server, instead got ', typeof app.general.server);

    console.log('Initializing WebSocket connection to: ', app.general.server);
    super(app.general.server + '/ws');

    this.info = info;
    this.app = app;
    AppSocket.instance = this;

    this.onopen = (ev) => {
      this.send(JSON.stringify({
        token: this.info.app.general.token,
        ws_id: info.app.general.ws_id,
      }));
    };

    this.onmessage = ({ data }: AppSocketResponse) => {
      const { data: _chunk } = JSON.parse(data) as AppSocketResponseData;
      this.info.setDownstream(new Blob([data]).size)
      if (isChunkDefault(_chunk)) {
        const events: Chunk['events'] = _chunk.events.map((event: RawChunkEvent): λEvent => ({
          _id: event._id,
          operation_id: event.operation_id,
          timestamp: event['@timestamp'],
          event: {
            code: event['gulp.event.code'],
            duration: event['event.duration']
          },
          file: event['gulp.source.file'],
          context: event['gulp.context'],
          _uuid: this.info.file_find_by_filename_and_context(event['gulp.source.file'], event['gulp.context'])?.uuid
        }));

        this.info.bucket_increase_fetched(events.length);
        this.info.events_add(events);
      } else {
        console.warn(_chunk);
      }
    }

    this.onerror = (error) => {
      console.error('[ WebSocket | ERROR ]:', error);
      AppSocket.instance = null;
    };

    this.onclose = (event) => {
      console.log('[ WebSocket | CLOSE ]:', event);
      AppSocket.instance = null;
    };
  }
}