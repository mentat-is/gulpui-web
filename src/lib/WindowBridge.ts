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

const CHANNEL_NAME = 'gulp-window-bridge'
const MAIN_CONTEXT_STORAGE_KEY = 'gulp-window-bridge:main-context'

export namespace WindowBridge {
  /**
   * Message types for cross-window communication.
   */
  export enum MessageType {
    /** Main → Detached: Theme changed */
    THEME_CHANGE = 'THEME_CHANGE',
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
    /** Detached ↔ Main: AI chat history was updated in IndexedDB */
    AI_HISTORY_UPDATED = 'AI_HISTORY_UPDATED',
    /** Detached → Main: User clicked "Dock" in the detached dialog window */
    DOCK_DIALOG = 'DOCK_DIALOG',
    /** Main → Detached: Current main-tab operation/auth lifecycle status */
    MAIN_CONTEXT_STATUS = 'MAIN_CONTEXT_STATUS',
    /** Detached → Main: Detached root mounted/reconnected and needs current state replay */
    DETACHED_READY = 'DETACHED_READY',
  }

  export type MainContextStatus = 'active' | 'initializing' | 'idle' | 'auth_lost'
  export const DETACHED_REPLAY_EVENT = 'gulp-detached-replay-request'

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
    selectedSourceIds?: string[]
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

  export interface MainContextStatusPayload {
    status: MainContextStatus
    contextVersion: number
    operationId?: Operation.Id | null
  }

  export interface DetachedReadyPayload {
    windowId: string
  }


  export type MessagePayload = {
    [MessageType.THEME_CHANGE]: ThemeChangePayload
    [MessageType.FLAGS_CHANGED]: FlagsChangedPayload
    [MessageType.RENDER_REQUEST]: RenderRequestPayload
    [MessageType.APP_SNAPSHOT]: AppSnapshotPayload
    [MessageType.BANNER_ACTION]: BannerActionPayload
    [MessageType.TABLE_SELECT_SOURCE]: TableSelectSourcePayload
    [MessageType.TARGET_NOTE]: TargetNotePayload
    [MessageType.EVENT_SELECTED]: EventSelectedPayload
    [MessageType.AI_HISTORY_UPDATED]: { senderId?: string }
    [MessageType.DOCK_DIALOG]: Record<string, never>
    [MessageType.MAIN_CONTEXT_STATUS]: MainContextStatusPayload
    [MessageType.DETACHED_READY]: DetachedReadyPayload
  }

  export interface Message<T extends MessageType = MessageType> {
    type: T
    payload: MessagePayload[T]
    /** Sender window identifier to prevent echo */
    senderId: string
  }

  export interface Bridge {
    send<T extends MessageType>(type: T, payload: MessagePayload[T]): void
    destroy(): void
  }

  export interface StoredMainContextReplay {
    createdAt: number
    status: MainContextStatusPayload
    snapshot?: AppSnapshotPayload
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
  ): Bridge {
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

  /**
   * Closes a one-shot bridge after the browser has had a chance to deliver
   * queued BroadcastChannel messages to detached windows.
   *
   * @param bridge - Temporary bridge created only for this broadcast.
   * @returns Nothing.
   */
  function destroyAfterMessageFlush(bridge: Bridge): void {
    window.setTimeout(() => bridge.destroy(), 100)
  }

  /**
   * Persists the last main-tab context so detached windows can recover when
   * BroadcastChannel delivery is interrupted by login redirects or reloads.
   *
   * @param replay - Serializable main-context replay payload.
   * @returns Nothing.
   */
  function writeStoredMainContext(replay: StoredMainContextReplay): void {
    try {
      localStorage.setItem(MAIN_CONTEXT_STORAGE_KEY, JSON.stringify(replay))
    } catch (error) {
      console.warn('Failed to store detached main context fallback', {
        error,
        status: replay.status.status,
        operationId: replay.status.operationId ?? null,
      })
    }
  }

  /**
   * Reads the latest stored main-tab context replay.
   *
   * @returns Stored replay payload, or null when none exists or parsing fails.
   */
  export function readStoredMainContext(): StoredMainContextReplay | null {
    try {
      const raw = localStorage.getItem(MAIN_CONTEXT_STORAGE_KEY)
      if (!raw) return null

      const replay = JSON.parse(raw) as StoredMainContextReplay
      if (!replay.status?.status || typeof replay.createdAt !== 'number') {
        return null
      }

      return replay
    } catch (error) {
      console.warn('Failed to read detached main context fallback', {
        error,
      })
      return null
    }
  }

  /**
   * Gets the storage key used for stored detached-window context replay.
   *
   * @returns LocalStorage key that contains the latest main context.
   */
  export function getMainContextStorageKey(): string {
    return MAIN_CONTEXT_STORAGE_KEY
  }

  /**
   * Builds a serializable lifecycle replay payload for detached windows.
   *
   * @param app - Current application state.
   * @param status - Lifecycle status to replay.
   * @param operationId - Operation associated with the replay.
   * @returns Serializable context replay payload.
   */
  function createMainContextReplay(
    app: App.Type,
    status: MainContextStatus,
    operationId?: Operation.Id | null,
  ): StoredMainContextReplay {
    const selectedSourceIds = app.target.files
      .filter((source) =>
        source.selected &&
        (!operationId || source.operation_id === operationId),
      )
      .map((source) => source.id)
    const statusPayload: MainContextStatusPayload = {
      status,
      contextVersion: Date.now(),
      operationId: operationId ?? null,
    }
    const replay: StoredMainContextReplay = {
      createdAt: Date.now(),
      status: statusPayload,
    }

    if (status === 'active') {
      replay.snapshot = {
        app: {
          target: {
            operations: operationId
              ? app.target.operations.map((operation) => ({
                ...operation,
                selected: operation.id === operationId,
              }))
              : app.target.operations,
            contexts: app.target.contexts,
            files: app.target.files,
            filters: app.target.filters,
          } as unknown as App.Type['target'],
        },
        selectedSourceIds,
      }
    }

    return replay
  }

  /**
   * Sends the currently selected timeline event to detached windows.
   *
   * @param bridge - Existing bridge used to send the event.
   * @param event - Selected event, or null when selection was cleared.
   * @returns Nothing.
   */
  export function sendSelectedEvent(
    bridge: Bridge,
    event: Doc.Type | null,
  ): void {
    bridge.send(MessageType.EVENT_SELECTED, { event })
  }

  /**
   * Broadcasts the currently selected timeline event to detached windows.
   *
   * @param event - Selected event, or null when selection was cleared.
   * @returns Nothing.
   */
  export function broadcastSelectedEvent(event: Doc.Type | null): void {
    const bridge = create(generateId(), () => {})
    sendSelectedEvent(bridge, event)
    destroyAfterMessageFlush(bridge)
  }

  /**
   * Sends only the main-tab lifecycle status to detached windows.
   *
   * @param bridge - Existing bridge used to send the lifecycle status.
   * @param status - Lifecycle status to send.
   * @param operationId - Operation associated with the status, when available.
   * @returns Nothing.
   */
  export function sendMainStatus(
    bridge: Bridge,
    status: MainContextStatus,
    operationId?: Operation.Id | null,
  ): void {
    const statusPayload: MainContextStatusPayload = {
      status,
      contextVersion: Date.now(),
      operationId: operationId ?? null,
    }

    bridge.send(MessageType.MAIN_CONTEXT_STATUS, statusPayload)
    writeStoredMainContext({
      createdAt: Date.now(),
      status: statusPayload,
    })
  }

  /**
   * Broadcasts only the main-tab lifecycle status to detached windows.
   *
   * @param status - Lifecycle status to send.
   * @param operationId - Operation associated with the status, when available.
   * @returns Nothing.
   */
  export function broadcastMainStatus(
    status: MainContextStatus,
    operationId?: Operation.Id | null,
  ): void {
    const bridge = create(generateId(), () => {})
    sendMainStatus(bridge, status, operationId)
    destroyAfterMessageFlush(bridge)
  }

  /**
   * Sends the current main-tab operation context to detached windows.
   *
   * @param bridge - Existing bridge used to send the context.
   * @param app - Current application snapshot to replay.
   * @param status - Lifecycle status to send before the snapshot.
   * @param operationId - Operation that should be selected in the detached snapshot.
   * @returns Nothing.
   */
  export function sendMainContext(
    bridge: Bridge,
    app: App.Type,
    status: MainContextStatus,
    operationId?: Operation.Id | null,
  ): void {
    const replay = createMainContextReplay(app, status, operationId)
    writeStoredMainContext(replay)

    bridge.send(MessageType.MAIN_CONTEXT_STATUS, replay.status)

    if (replay.snapshot) {
      bridge.send(MessageType.APP_SNAPSHOT, replay.snapshot)
    }

    sendSelectedEvent(bridge, app.timeline.target)
  }

  /**
   * Broadcasts the current main-tab operation context to detached windows.
   *
   * @param app - Current application snapshot to replay.
   * @param status - Lifecycle status to send before the snapshot.
   * @param operationId - Operation that should be selected in the detached snapshot.
   * @returns Nothing.
   */
  export function broadcastMainContext(
    app: App.Type,
    status: MainContextStatus,
    operationId?: Operation.Id | null,
  ): void {
    const bridge = create(generateId(), () => {})
    sendMainContext(bridge, app, status, operationId)
    destroyAfterMessageFlush(bridge)
  }
}
