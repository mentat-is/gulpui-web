/**
 * DetachedApp.Provider — Lightweight Application context for detached browser windows.
 *
 * ARCHITECTURE: Detached windows (TableViewWindow, NotesWindow) previously used
 * ReactDOM.createPortal which kept them in the main tab's React tree. Every state
 * change in the main tab caused cross-window DOM reconciliation, degrading performance.
 *
 * This provider creates an INDEPENDENT React context for each detached window:
 * - Own [app, setInfo] state (initialized from a snapshot of the main tab's state)
 * - Own Info instance (uses global `api()` for network requests)
 * - Own banner system (spawnBanner/destroyBanner work locally)
 * - BroadcastChannel listener for cross-window sync (theme, notes, flags)
 *
 * PERFORMANCE: The main tab no longer reconciles detached window DOM. State changes
 * in the main tab only reach detached windows via lightweight BroadcastChannel messages.
 */
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  ReactNode,
} from 'react'
import { Application } from '@/context/Application.context'
import { Info } from '@/class/Info'
import { App } from '@/entities/App'
import { WindowBridge } from '@/lib/WindowBridge'
import { DataStore } from '@/store/DataStore'
import { Note } from '@/entities/Note'
import { RenderEngine } from '@/class/RenderEngine'
import { Color } from '@/entities/Color'
import { Operation } from '@/entities/Operation'
import { Source } from '@/entities/Source'
import { Request } from '@/entities/Request'
import { Extension } from '@/context/Extension.context'

export namespace DetachedApp {
  export interface ProviderProps {
    /** Serialized snapshot of the main tab's app state */
    initialApp: App.Type
    /** Initial notes data from DataStore */
    initialNotes: Note.Type[]
    /** BroadcastChannel bridge ID (used to create a listener) */
    bridgeId: string
    /** The detached window's document, used for portal/selection APIs */
    detachedDocument: Document
    /** Main window's spawnBanner — banners should open in the main window, not the detached one */
    mainSpawnBanner: (node: ReactNode, target?: string) => void
    /** Children to render inside the provider */
    children: ReactNode
  }
}

export function DetachedAppProvider({
  initialApp,
  initialNotes,
  bridgeId,
  detachedDocument,
  mainSpawnBanner,
  children,
}: DetachedApp.ProviderProps) {
  const [app, setRawInfo] = useState<App.Type>(initialApp)
  const [banner, setBanner] = useState<{ node: ReactNode; target: string } | null>(null)
  const [dialog, setDialog] = useState<ReactNode>(null)
  const timeline = useRef<HTMLDivElement>(null as unknown as HTMLDivElement)
  const [highlightsOverlay, setHighlightsOverlay] = useState<ReactNode>(null)

  // Initialize DataStore notes in the detached window context
  useEffect(() => {
    DataStore.notes = [...initialNotes]
  }, []) // Only on mount

  /**
   * Authoritative loadings ref — prevents loading maps from being lost
   * to concurrent state interleaving between setLoading, events_reset_in_file,
   * and other setInfoByKey calls during the refetch flow.
   *
   * This ref is the single source of truth for which sources are currently loading.
   * It is updated BEFORE the React state and re-applied AFTER every state update.
   */
  const loadingsRef = useRef<{
    byRequestId: Map<Request.Id, Source.Id>;
    byFileId: Map<Source.Id, Request.Id>;
  }>({
    byRequestId: new Map(),
    byFileId: new Map(),
  })

  /**
   * Wrapped setInfo that re-applies authoritative loadings after every state update.
   * This ensures that concurrent setInfoByKey calls (e.g. from events_reset_in_file)
   * cannot overwrite the loading maps set by setLoading.
   */
  const setInfo = useCallback(
    (action: React.SetStateAction<App.Type>) => {
      setRawInfo((prev) => {
        const next = typeof action === 'function' ? action(prev) : action
        // Re-apply authoritative loadings to prevent state interleaving
        return {
          ...next,
          general: {
            ...next.general,
            loadings: {
              byRequestId: new Map(loadingsRef.current.byRequestId),
              byFileId: new Map(loadingsRef.current.byFileId),
            },
          },
        }
      })
    },
    []
  )

  // Create a stable Info instance for the detached window
  const infoRef = useRef<Info | null>(null)
  if (!infoRef.current) {
    infoRef.current = new Info({ app, setInfo, timeline })
  } else {
    infoRef.current.app = app
    infoRef.current.setInfo = setInfo
  }
  const instance = infoRef.current

  /**
   * Patch setLoading/delLoading on the detached Info instance to keep
   * the authoritative loadingsRef in sync. This ensures the loading
   * state persists across concurrent React state updates.
   */
  if (!(infoRef.current as any)._detachedPatched) {
    const origSetLoading = instance.setLoading.bind(instance)
    instance.setLoading = (reqId: Request.Id, fileId: Source.Id) => {
      loadingsRef.current.byRequestId.set(reqId, fileId)
      loadingsRef.current.byFileId.set(fileId, reqId)
      origSetLoading(reqId, fileId)
    }

    const origDelLoading = instance.delLoading.bind(instance)
    instance.delLoading = (reqId: Request.Id) => {
      loadingsRef.current.byRequestId.delete(reqId)
      const fileId = [...loadingsRef.current.byFileId.entries()]
        .find(([, v]) => v === reqId)?.[0]
      if (fileId) loadingsRef.current.byFileId.delete(fileId)
      origDelLoading(reqId)
    }

    ;(infoRef.current as any)._detachedPatched = true
  }

  // Listen for incoming BroadcastChannel messages from the main tab
  useEffect(() => {
    const bridge = WindowBridge.create(bridgeId, (message) => {
      switch (message.type) {
        case WindowBridge.MessageType.THEME_CHANGE: {
          const { theme } = message.payload as WindowBridge.ThemeChangePayload
          // Set data-theme attribute; full CSS variable sync is handled by
          // direct DOM access via applyThemeToWindow in Navigator.tsx
          document.documentElement.setAttribute('data-theme', theme)
          Color.Themer.setTheme(theme as any)
          // Trigger re-render to pick up new colors from getTargetGuideColor()
          setInfo(prev => ({
            ...prev,
            timeline: {
              ...prev.timeline,
              renderVersion: prev.timeline.renderVersion + 1,
            },
          }))
          break
        }
        case WindowBridge.MessageType.APP_SNAPSHOT: {
          const { app: snapshot, selectedSourceIds } = message.payload as WindowBridge.AppSnapshotPayload
          selectedSourceIdsRef.current = selectedSourceIds

          setInfo(prev => {
            const oldOpId = prev.target.operations.find((o: Operation.Type) => o.selected)?.id
            const newOpId = snapshot.target?.operations?.find((o: Operation.Type) => o.selected)?.id
            const opChanged = newOpId && oldOpId && newOpId !== oldOpId

            const next = {
              ...prev,
              ...snapshot,
              target: snapshot.target ? {
                ...prev.target,
                ...snapshot.target,
                // Clear stale files/contexts immediately if operation changed
                files: opChanged ? [] : prev.target.files,
                contexts: opChanged ? [] : prev.target.contexts,
              } : prev.target
            }

            // Sync selection status for existing files if no op change
            if (!opChanged && selectedSourceIds) {
              next.target.files = next.target.files.map((f: Source.Type) => ({
                ...f,
                selected: selectedSourceIds.includes(f.id)
              }))
            }

            return next
          })
          break
        }
        case WindowBridge.MessageType.EVENT_SELECTED: {
          const { event } = message.payload as WindowBridge.EventSelectedPayload
          setInfo(prev => ({
            ...prev,
            timeline: {
              ...prev.timeline,
              target: event
            }
          }))
          break
        }
      }
    })

    return () => {
      bridge.destroy()
    }
  }, [bridgeId])

  // Reactively fetch new sources/contexts when the selected operation changes.
  // This avoids sending large source lists over BroadcastChannel (APP_SNAPSHOT).
  const selectedOperationId = app.target.operations.find(o => o.selected)?.id
  const prevOperationIdRef = useRef<string | null | undefined>(undefined)
  const selectedSourceIdsRef = useRef<string[] | null | undefined>(null)

  useEffect(() => {
    if (selectedOperationId && prevOperationIdRef.current !== undefined && selectedOperationId !== prevOperationIdRef.current) {
      // Operation changed and it's not the initial mount -> sync fresh data from server
      instance.sync().then(() => {
        // Apply selection status after sync finishes
        if (selectedSourceIdsRef.current) {
          setInfo(prev => ({
            ...prev,
            target: {
              ...prev.target,
              files: prev.target.files.map((f: Source.Type) => ({
                ...f,
                selected: selectedSourceIdsRef.current!.includes(f.id)
              }))
            }
          }))
        }
      }).catch(err => console.error('Failed to sync detached app', err))
    }
    if (selectedOperationId) {
      prevOperationIdRef.current = selectedOperationId
    }
  }, [selectedOperationId, instance])

  const destroyBanner = useCallback(() => {
    setBanner(null)
    detachedDocument.body.classList.remove('no-scroll')
  }, [detachedDocument])

  const spawnBanner = useCallback((node: ReactNode, target: string = 'main') => {
    if (target === 'table' || target === 'main') {
      setBanner({ node, target })
      detachedDocument.body.classList.add('no-scroll')
      return
    }

    mainSpawnBanner(node, target)
  }, [detachedDocument, mainSpawnBanner])

  const spawnDialog = useCallback((dialog: ReactNode) => {
    setDialog(dialog)
  }, [])

  const outboundBridgeRef = useRef<ReturnType<typeof WindowBridge.create> | null>(null)
  useEffect(() => {
    const sendId = WindowBridge.generateId()
    outboundBridgeRef.current = WindowBridge.create(sendId, () => { })
    return () => {
      outboundBridgeRef.current?.destroy()
      outboundBridgeRef.current = null
    }
  }, [])

  // Sync timeline target selection back to the main window so the canvas crosshair updates.
  // Use _id as dep to avoid re-firing when the same event is echoed back as a new object ref.
  useEffect(() => {
    outboundBridgeRef.current?.send(WindowBridge.MessageType.EVENT_SELECTED, {
      event: app.timeline.target ?? null,
    })
  }, [app.timeline.target?._id])

  const setDockedState = useCallback(() => {
    outboundBridgeRef.current?.send(WindowBridge.MessageType.DOCK_DIALOG, {})
  }, [])

  const props = useMemo(
    () => ({
      spawnBanner,
      destroyBanner,
      banner,
      spawnDialog,
      dialog,
      app,
      setInfo,
      Info: instance,
      timeline,
      highlightsOverlay,
      setHighlightsOverlay,
      canvasDocked: true,
      setCanvasDocked: setDockedState,
      dialogsDocked: true,
      setDialogsDocked: setDockedState,
      hintOpen: false,
      setHintOpen: () => { },
      toggleHintOpen: () => { },
      isDetachedWindow: true,
      currentDocument: detachedDocument,
    }),
    [
      spawnBanner,
      destroyBanner,
      banner,
      spawnDialog,
      dialog,
      app,
      setInfo,
      instance,
      timeline,
      highlightsOverlay,
      setHighlightsOverlay,
      setDockedState,
    ],
  )

  return (
    <Application.Context.Provider value={props}>
      <Extension.Provider>
        {children}
      </Extension.Provider>
    </Application.Context.Provider>
  )
}
