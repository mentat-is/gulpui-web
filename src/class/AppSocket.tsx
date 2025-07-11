import { Info, Internal } from '@/class/Info'
import { Pointers } from '@/components/Pointers'
import { Logger } from '@/dto/Logger.class'

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
        MultiSocket,
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
        `Recieved new client data for ${message.data.data.id} with ${message.data.data.timestamp} and ${message.data.data.y}`, MultiSocket,
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
