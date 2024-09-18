import { File, Info } from '@/class/Info';
import { AppSocketResponse, AppSocketResponseData } from '@/dto/AppSocket.dto';
import { Chunk, isChunkDefault, isChunkType_6 } from '@/dto/Chunk.dto';
import { λEvent, RawChunkEvent } from '@/dto/ChunkEvent.dto';

export class AppSocket extends WebSocket {
  private static instance: AppSocket | null = null;
  info!: Info;

  constructor(info: Info) {
    if (AppSocket.instance) {
      AppSocket.instance.info = info;
      return AppSocket.instance;
    }
    
    super(`${info.ws_link}`);

    this.info = info;
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

        const x = _chunk.events.filter(e => !e['gulp.context'] || !e['gulp.source.file']);
        console.log(x);

        this.info.bucket_increase_fetched(events.length);
        this.info.events_add(events);
      } else {
        console.log(_chunk);
      }
    }

    this.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.onclose = (ev) => {
      console.log('WebSocket connection closed:', ev);
      AppSocket.instance = null;
    };
  }
}