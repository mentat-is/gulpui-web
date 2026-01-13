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
  export type Condition<T = any> = (data: Message.Entity<T>) => boolean
  export type Handler<T = any> = (data: Message.Entity<T>) => void

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
      STATS_CREATE = "stats_create",
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
      SOURCE_FIELDS_CHUNK = "source_fields_chunk",
      AI_ASSISTANT_DONE = "ai_assistant_done",
      AI_ASSISTANT_STREAM = "ai_assistant_stream",
      AI_ASSISTANT_ERROR = "ai_assistant_error"
    }

    export interface Entity<T = any> {
      '@timestamp': number
      type: Message.Type
      private: boolean
      payload: {
        obj: T
        last?: boolean
        docs?: Doc.Type[]
        [key: string]: any
      }
      ws_id: string
      user_id: User.Id
      req_id: Request.Id
      'gulp.operation_id': Operation.Id
    }
  }

  export class Class extends EventEmitter {
    public static readonly instance: SmartSocket.Class;

    private readonly ws!: WebSocket
    private readonly conditional: Map<SmartSocket.Message.Type, Conditional[]> = new Map()
    private counter = 0

    constructor(ws_id: string) {
      super()

      if (SmartSocket.Class.instance) {
        return SmartSocket.Class.instance
      }

      this.ws = new WebSocket(Internal.Settings.server + "/ws")
      this.forwarding(Internal.Settings.token, ws_id);

      // @ts-ignore
      SmartSocket.Class.instance = this;
    }

    private forwarding(token: string, ws_id: string) {
      this.ws.onopen = (event) => {
        this.send({ token, ws_id })
        this.once(SmartSocket.Message.Type.WS_CONNECTED, () =>
          Logger.log(`WebSocket has been initialized`, SmartSocket.Class, {
            icon: <Icon name='Rss' />
          })
        )
        this.emit('open', event)
      }

      this.ws.onclose = (event) => {
        this.emit('close', event)
      }

      this.ws.onerror = (event) => {
        this.emit('error', event)
      }

      this.ws.onmessage = (event) => {
        let message: any
        try {
          message = JSON.parse(event.data)
        } catch (err) {
          this.emit(SmartSocket.Message.Type.WS_ERROR, { error: err, raw: event.data })
          return
        }

        this.emit(message.type, message)
        this.handle(message.type as SmartSocket.Message.Type, message)
      }
    }

    private handle(event: SmartSocket.Message.Type, data: any) {
      const listeners = this.conditional.get(event) || []
      const remove: string[] = []

      for (const listener of listeners) {
        try {
          if (listener.condition(data)) {
            listener.handler(data)
            if (listener.once) remove.push(listener.id)
          }
        } catch (err) {
          // swallow handler errors to avoid breaking loop
          Logger.log(`Handler error for ${event}: ${(err as Error).message}`, SmartSocket.Class)
        }
      }

      for (const id of remove) this.remove(event, id)
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
      const listeners = this.conditional.get(event) ?? []
      listeners.push({ id, condition, handler, once: false })
      this.conditional.set(event, listeners)
      return id
    }

    conce<T = any>(
      event: SmartSocket.Message.Type,
      condition: Condition<T>,
      handler: Handler<T>
    ): string {
      const id = `listener_${++this.counter}`
      const listeners = this.conditional.get(event) ?? []
      listeners.push({ id, condition, handler, once: true })
      this.conditional.set(event, listeners)
      return id
    }

    coff(event: SmartSocket.Message.Type, listenerId: string): void {
      this.remove(event, listenerId)
    }

    coffAll(event: SmartSocket.Message.Type): void {
      this.conditional.delete(event)
    }

    coffWhenCondition<T = any>(event: SmartSocket.Message.Type, condition: Condition<T>): void {
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
    ): Promise<Message.Entity<T>> {
      return new Promise((resolve, reject) => {
        let timeoutId: any = null

        const listenerId = this.conce<T>(event, condition, (data) => {
          if (timeoutId) clearTimeout(timeoutId)
          resolve(data as Message.Entity<T>)
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
      try {
        if (this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify(data))
        } else {
          Logger.log('WebSocket not open, cannot send message', SmartSocket.Class)
        }
      } catch (err) {
        Logger.log(`Failed to send websocket message: ${(err as Error).message}`, SmartSocket.Class)
      }
    }

    close(code?: number, reason?: string): void {
      try {
        this.ws.close(code, reason)
      } catch (err) {
        Logger.log(`Failed to close websocket: ${(err as Error).message}`, SmartSocket.Class)
      }
    }
  }
}
