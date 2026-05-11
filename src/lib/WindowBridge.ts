/**
 * WindowBridge — BroadcastChannel-based communication layer for detached windows.
 *
 * Replaces ReactDOM.createPortal cross-window DOM coupling with a message-passing
 * architecture. Each detached window gets its own React root and communicates
 * state changes (notes, flags, theme) via serializable messages.
 *
 * PERFORMANCE: This eliminates the primary cause of main-tab slowdown — React
 * reconciliation of cross-window DOM nodes on every state change.
 */
import type { Note } from '@/entities/Note'
import type { App } from '@/entities/App'
import type { Doc } from '@/entities/Doc'
import type { Operation } from '@/entities/Operation'
import type { MinMax } from '@/class/Info'

const CHANNEL_NAME = 'gulp-window-bridge'

export namespace WindowBridge {
  /**
   * Message types for cross-window communication.
   */
  export enum MessageType {
    /** Main → Detached: Theme changed */
    THEME_CHANGE = 'THEME_CHANGE',
    /** Bidirectional: Notes were created or deleted */
    NOTES_CHANGED = 'NOTES_CHANGED',
    /** Detached → Main: Document flag toggled */
    FLAGS_CHANGED = 'FLAGS_CHANGED',
    /** Main → Detached: Canvas re-rendered (renderVersion bumped) */
    RENDER_REQUEST = 'RENDER_REQUEST',
    /** Main → Detached: Partial app state snapshot */
    APP_SNAPSHOT = 'APP_SNAPSHOT',
    /** Detached → Main: Banner action (destroy) */
    BANNER_ACTION = 'BANNER_ACTION',
    /** Main → Detached: Select specific source in table view */
    TABLE_SELECT_SOURCE = 'TABLE_SELECT_SOURCE',
    /** Detached → Main: User clicked "target note" button — open event dialog in main tab */
    TARGET_NOTE = 'TARGET_NOTE',
    /** Main → Detached: An event was selected in the timeline */
    EVENT_SELECTED = 'EVENT_SELECTED',
    /** Main → Detached: Timeline frame (time range) changed */
    FRAME_CHANGED = 'FRAME_CHANGED',
  }

  export interface ThemeChangePayload {
    theme: string
    /** CSS custom properties (--var-name → value) to apply to the target document */
    cssVariables?: Record<string, string>
  }

  export interface NotesChangedPayload {
    action: 'created' | 'deleted'
    notes?: Note.Type[]
    ids?: Note.Id[]
  }

  export interface FlagsChangedPayload {
    docId: Doc.Id
    operationId: Operation.Id
  }

  export interface RenderRequestPayload {
    renderVersion: number
  }

  export interface AppSnapshotPayload {
    app: Partial<App.Type>
  }

  export interface BannerActionPayload {
    action: 'destroy'
  }

  export interface TableSelectSourcePayload {
    sourceId: string
  }

  export interface TargetNotePayload {
    /** The document ID associated with the note */
    docId: Doc.Id
    /** The operation ID associated with the note */
    operationId: Operation.Id
  }

  export interface EventSelectedPayload {
    event: Doc.Type | null
  }

  export interface FrameChangedPayload {
    frame: MinMax
  }

  export type MessagePayload = {
    [MessageType.THEME_CHANGE]: ThemeChangePayload
    [MessageType.NOTES_CHANGED]: NotesChangedPayload
    [MessageType.FLAGS_CHANGED]: FlagsChangedPayload
    [MessageType.RENDER_REQUEST]: RenderRequestPayload
    [MessageType.APP_SNAPSHOT]: AppSnapshotPayload
    [MessageType.BANNER_ACTION]: BannerActionPayload
    [MessageType.TABLE_SELECT_SOURCE]: TableSelectSourcePayload
    [MessageType.TARGET_NOTE]: TargetNotePayload
    [MessageType.EVENT_SELECTED]: EventSelectedPayload
    [MessageType.FRAME_CHANGED]: FrameChangedPayload
  }

  export interface Message<T extends MessageType = MessageType> {
    type: T
    payload: MessagePayload[T]
    /** Sender window identifier to prevent echo */
    senderId: string
  }

  /**
   * Creates a new BroadcastChannel instance for cross-window communication.
   *
   * @param id — Unique identifier for the sender (prevents echo)
   * @param onMessage — Callback for incoming messages (filtered to exclude own messages)
   * @returns An object with `send()` and `destroy()` methods
   */
  export function create(
    id: string,
    onMessage: (message: Message) => void,
  ) {
    const channel = new BroadcastChannel(CHANNEL_NAME)

    channel.onmessage = (event: MessageEvent<Message>) => {
      // Ignore own messages
      if (event.data.senderId === id) return
      onMessage(event.data)
    }

    return {
      send<T extends MessageType>(type: T, payload: MessagePayload[T]) {
        channel.postMessage({ type, payload, senderId: id } satisfies Message<T>)
      },
      destroy() {
        channel.close()
      },
    }
  }

  /**
   * Generate a unique window identifier for BroadcastChannel filtering.
   */
  export function generateId(): string {
    return `win_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  }
}
