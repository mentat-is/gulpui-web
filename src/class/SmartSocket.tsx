import { Logger } from "@/dto/Logger.class"
import { Internal } from '@/entities/addon/Internal'
import { Doc } from "@/entities/Doc"
import { Group } from "@/entities/Group"
import { Operation } from "@/entities/Operation"
import { Request } from "@/entities/Request"
import { User } from "@/entities/User"
import { Icon } from "@impactium/icons"
import { EventEmitter } from 'events'

export namespace SmartSocket {
  type Condition = (data: Message.Entity) => boolean
  type Handler = (data: Message.Entity) => void

  interface Conditional<T = Message.Entity> {
    id: string
    condition: Condition
    handler: Handler
    once?: boolean
  }
  export namespace Message {
    export enum Type {
      WS_ERROR = "ws_error",
      WS_CONNECTED = "ws_connected",
      STATS_CREATE = 'stats_update',
      STATS_UPDATE = "stats_update",
      COLLAB_CREATE = "collab_create",
      COLLAB_UPDATE = "collab_update",
      USER_LOGIN = "user_login",
      USER_LOGOUT = "user_logout",
      DOCUMENTS_CHUNK = "docs_chunk",
      COLLAB_DELETE = "collab_delete",
      INGEST_SOURCE_DONE = "ingest_source_done",
      ENRICH_DONE = "enrich_done",
      TAG_DONE = "tag_done",
      QUERY_GROUP_MATCH = "query_group_match",
      REBASE_DONE = "rebase_done",
      CLIENT_DATA = "client_data",
      SOURCE_FIELDS_CHUNK = "source_fields_chunk"
    }

    export interface Entity {
      '@timestamp': number,
      type: Message.Type,
      private: boolean,
      payload: {
        obj: {
          operation_id: Operation.Id,
          server_id: string,
          status: string,
          req_type: string,
          time_expire: number,
          time_finished: number,
          errors: string[],
          data: any,
          id: Request.Id,
          type: string,
          user_id: User.Id,
          name: string,
          time_created: number,
          time_updated: number,
          tags: string[],
          granted_user_ids: User.Id[],
          granted_user_group_ids: Group.Id[]
        },
        last?: boolean;
        docs?: Doc.Type[]
        [key: string]: any;
      },
      ws_id: string,
      user_id: User.Id,
      req_id: Request.Id,
      'gulp.operation_id': Operation.Id
    }
  }

  export class Class extends EventEmitter {
    public static readonly instance: SmartSocket.Class;
    private readonly ws!: WebSocket;
    private readonly conditional: Map<string, Conditional[]> = new Map()
    private counter = 0

    constructor(ws_id: string) {
      super()
      if (!ws_id.length) {
        return;
      }

      if (SmartSocket.Class.instance) {
        return SmartSocket.Class.instance
      }

      this.ws = new WebSocket(Internal.Settings.server + "/ws");
      this.forwarding(Internal.Settings.token, ws_id);
      // @ts-ignore
      SmartSocket.Class.instance = this;

      setInterval(() => {
        Logger.log(JSON.stringify([...SmartSocket.Class.instance.conditional.entries()], null, 2), 'SmartSocket.Class')
      }, 5000);
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

    con(
      event: SmartSocket.Message.Type,
      condition: Condition,
      handler: Handler
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

    conce(
      event: SmartSocket.Message.Type,
      condition: Condition,
      handler: Handler
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

    coffWhenCondition<T = Message.Entity>(
      event: SmartSocket.Message.Type,
      condition: Condition
    ): void {
      const listeners = this.conditional.get(event) || []
      const filtered = listeners.filter(l => l.condition !== condition)

      if (filtered.length === 0) {
        this.conditional.delete(event)
      } else {
        this.conditional.set(event, filtered)
      }
    }

    wait(
      event: SmartSocket.Message.Type,
      condition: Condition,
      timeout?: number
    ): Promise<Message.Entity> {
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
