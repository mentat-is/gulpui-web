import { Event, Info, Internal } from '@/class/Info'
import { Pointers } from '@/components/Pointers'
import { λEvent } from '@/dto/ChunkEvent.dto'
import { Logger } from '@/dto/Logger.class'
import { toast } from 'sonner'

export class AppSocket extends WebSocket {
  static instance: AppSocket | null = null
  info!: Info

  constructor(info: Info) {
    if (AppSocket.instance) {
      AppSocket.instance.info = info
      return AppSocket.instance
    }

    super(Internal.Settings.server + '/ws')

    this.info = info
    AppSocket.instance = this

    this.onopen = () => {
      Logger.log(
        `WebSocket has been initialized`,
        AppSocket.name,
        {
          toast: true,
          icon: 'Serverless'
        },
      )
      this.send(
        JSON.stringify({
          token: this.info.app.general.token,
          ws_id: this.info.app.general.ws_id,
        }),
      )
    }

    this.onmessage = ({ data }) => {
      const message = JSON.parse(data)

      const { data: chunk } = message

      switch (true) {
        case message.type === 'docs_chunk':
          const events: λEvent[] = chunk.docs.map((e: λEvent) => ({
            ...e,
            ['gulp.timestamp']: BigInt(e['gulp.timestamp']),
            timestamp: Math.round(Number(e['gulp.timestamp']) / 1_000_000)
          }))
          if (message.req_id.startsWith('temp-')) {
            this.info.events_add(events, message.req_id);
          } else {
            this.info.events_add(events);
          }

          return;

        case message.type === 'ingest_source_done':
          info.sync().then(() => {
            info.request_finish(message.data.req_id, 'done')
          })
          return

        case message.type === 'collab_update' || message.type === 'collab_delete':
          info.notes_reload()
          info.links_reload()
          info.highlights_reload()
          return

        case message.type === 'enrich_done':
          toast(
            message.data.status === 'failed'
              ? 'Enrichment went wrong'
              : 'Enrichment done',
            {
              description: `Total processed documents: ${message.data.total_hits ?? 0}`,
            },
          )
          return

        case message.type === 'query_done':
          if (message.data.status === 'done') {
            toast('Query finished', {
              description: `Total processed documents: ${message.data.total_hits ?? 0}`,
            })
            this.info.request_finish(message.req_id, message.data.status)
          } else {
            toast.error('Query failed', {
              description: message.data.error ?? 'Unknown error',
              richColors: true,
            })
            this.info.request_finish(message.req_id, message.data.status)
          }
          return
      }
    }

    this.onerror = (error) => {
      Logger.error(
        `WebSocket error: ${typeof error === 'object' ? JSON.stringify(error, null, 2) : error}`,
        AppSocket.name,
        {
          toast: true,
        },
      )
      AppSocket.instance = null
    }

    this.onclose = (event) => {
      Logger.error(
        `WebSocket has been closed. Reason: ${typeof event === 'object' ? JSON.stringify(event, null, 2) : event}`,
        AppSocket.name,
        {
          toast: true,
        },
      )
      AppSocket.instance = null
    }
  }
}

export class MultiSocket extends WebSocket {
  static instance: MultiSocket | null = null
  info!: Info

  constructor(info: Info) {
    if (MultiSocket.instance) {
      MultiSocket.instance.info = info
      return MultiSocket.instance
    }

    super(Internal.Settings.server + '/ws_client_data')

    this.info = info
    MultiSocket.instance = this

    this.onopen = () => {
      Logger.log(
        `MultiSocket has been initialized with id: ${this.info.app.general.ws_id}`,
        MultiSocket.name,
      )
      this.send(
        JSON.stringify({
          token: this.info.app.general.token,
          ws_id: this.info.app.general.ws_id,
        }),
      )
    }

    this.onmessage = ({ data }) => {
      if (!data) {
        return
      }

      if (data.type === 'ws_connected') {
        return
      }

      const message: {
        data: {
          data: Pointers.Pointer
        }
      } = JSON.parse(data)

      if (!message?.data?.data?.id) {
        return
      }

      if (message.data.data.id === this.info.app.general.id) {
        return
      }

      Logger.log(
        `Recieved new client data for ${message.data.data.id} with ${message.data.data.timestamp} and ${message.data.data.y}`,
        'MuliSocket',
      )

      this.info.setPointers(message.data.data)
    }

    this.onerror = (error) => {
      Logger.error(
        `WebSocket error: ${typeof error === 'object' ? JSON.stringify(error, null, 2) : error}`,
        MultiSocket.name,
        {
          toast: true,
        },
      )
      MultiSocket.instance = null
    }

    this.onclose = (event) => {
      Logger.error(
        `WebSocket has been closed. Reason: ${typeof event === 'object' ? JSON.stringify(event, null, 2) : event}`,
        MultiSocket.name,
        {
          toast: true,
        },
      )
      MultiSocket.instance = null
    }
  }

  sendPointer = (data: Pointers.Pointer) => {
    try {
      this.send(JSON.stringify({ data }))
    } catch (error) {
      Logger.error(error, 'MultiSocket.sendPointer')
    }
  }
}
