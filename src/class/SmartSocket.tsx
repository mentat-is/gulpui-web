import { Logger } from "@/dto/Logger.class"
import { Icon } from "@impactium/icons"
import { EventEmitter } from 'events'

export namespace SmartSocket {
  type Condition<T = any> = (data: T) => boolean
  type Handler<T = any> = (data: T) => void

  interface Conditional<T = any> {
    id: string
    condition: Condition<T>
    handler: Handler<T>
    once?: boolean
  }
  export namespace Message {
    export enum Type {
      WS_ERROR = "ws_error",
      WS_CONNECTED = "ws_connected",
      STATS_UPDATE = "stats_update",
      COLLAB_UPDATE = "collab_update",
      USER_LOGIN = "user_login",
      USER_LOGOUT = "user_logout",
      DOCUMENTS_CHUNK = "docs_chunk",
      COLLAB_DELETE = "collab_delete",
      INGEST_SOURCE_DONE = "ingest_source_done",
      QUERY_DONE = "query_done",
      ENRICH_DONE = "enrich_done",
      TAG_DONE = "tag_done",
      QUERY_GROUP_MATCH = "query_group_match",
      REBASE_DONE = "rebase_done",
      CLIENT_DATA = "client_data",
      SOURCE_FIELDS_CHUNK = "source_fields_chunk",
      NEW_SOURCE = "new_source",
      NEW_CONTEXT = "new_context"
    }
  }

  export class Class extends EventEmitter {
    public static readonly instance: SmartSocket.Class;
    private readonly ws!: WebSocket;
    private readonly conditional: Map<string, Conditional[]> = new Map()
    private counter = 0

    constructor(url: string, token: string, ws_id: string) {
      super()
      if (!url.length || !token.length || !ws_id.length) {
        return;
      }

      if (SmartSocket.Class.instance) {
        return SmartSocket.Class.instance
      }

      this.ws = new WebSocket(url);
      this.forwarding(token, ws_id);
      // @ts-ignore
      SmartSocket.Class.instance = this;
    }

    private forwarding(token: string, ws_id: string) {
      this.ws.onopen = (event) => {
        this.send({ token, ws_id });
        this.once(SmartSocket.Message.Type.WS_CONNECTED, () => Logger.log(`WebSocket has been initialized`, SmartSocket.Class, {
          icon: <Icon name='Rss' />
        }));
        this.emit('open', event)
      }

      this.ws.onclose = (event) => {
        this.emit('close', event)
      }

      this.ws.onerror = (event) => {
        this.emit('error', event)
      }

      this.ws.onmessage = (event) => {
        const message = JSON.parse(event.data);

        this.emit(message.type, message);
        this.handle(message.type, message);
      }
    }

    private handle(event: SmartSocket.Message.Type, data: any) {
      const listeners = this.conditional.get(event) || [];
      const remove: string[] = []

      for (const listener of listeners) {
        if (listener.condition(data)) {
          listener.handler(data)

          if (listener.once) {
            remove.push(listener.id)
          }
        }
      }

      remove.forEach(id => this.remove(event, id));
    }

    private remove(event: SmartSocket.Message.Type, id: string) {
      const listeners = this.conditional.get(event) || []
      const filtered = listeners.filter(l => l.id !== id)

      if (filtered.length === 0) {
        this.conditional.delete(event)
      } else {
        this.conditional.set(event, filtered)
      }
    }

    con<T = any>(
      event: SmartSocket.Message.Type,
      condition: Condition<T>,
      handler: Handler<T>
    ): string {
      const id = `listener_${++this.counter}`

      const listeners = this.conditional.get(event) ?? [];

      this.conditional.set(event, [
        ...listeners,
        {
          id,
          condition,
          handler,
          once: false
        }
      ]);

      return id
    }

    conce<T = any>(
      event: SmartSocket.Message.Type,
      condition: Condition<T>,
      handler: Handler<T>
    ): string {
      const id = `listener_${++this.counter}`

      if (!this.conditional.has(event)) {
        this.conditional.set(event, [])
      }

      this.conditional.get(event)!.push({
        id,
        condition,
        handler,
        once: true
      })

      return id
    }

    coff(event: SmartSocket.Message.Type, listenerId: string): void {
      this.remove(event, listenerId)
    }

    coffAll(event: SmartSocket.Message.Type): void {
      this.conditional.delete(event)
    }

    coffWhenCondition<T = any>(
      event: SmartSocket.Message.Type,
      condition: Condition<T>
    ): void {
      const listeners = this.conditional.get(event) || []
      const filtered = listeners.filter(l => l.condition !== condition)

      if (filtered.length === 0) {
        this.conditional.delete(event)
      } else {
        this.conditional.set(event, filtered)
      }
    }

    wait<T = any>(
      event: SmartSocket.Message.Type,
      condition: Condition<T>,
      timeout?: number
    ): Promise<T> {
      return new Promise((resolve, reject) => {
        let timeoutId: NodeJS.Timeout | null = null

        const listenerId = this.conce(event, condition, (data) => {
          if (timeoutId) {
            clearTimeout(timeoutId)
          }
          resolve(data)
        })

        if (timeout) {
          timeoutId = setTimeout(() => {
            this.coff(event, listenerId)
            reject(new Error(`Timeout waiting for ${event} event`))
          }, timeout)
        }
      })
    }

    send(data: object): void {
      this.ws.send(JSON.stringify(data))
    }

    close(code?: number, reason?: string): void {
      this.ws.close(code, reason)
    }
  }
}
