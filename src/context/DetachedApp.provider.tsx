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
import {
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

export namespace DetachedApp {
  export interface ProviderProps {
    /** Serialized snapshot of the main tab's app state */
    initialApp: App.Type
    /** Initial notes data from DataStore */
    initialNotes: Note.Type[]
    /** BroadcastChannel bridge ID (used to create a listener) */
    bridgeId: string
    /** Children to render inside the provider */
    children: ReactNode
  }
}

export function DetachedAppProvider({
  initialApp,
  initialNotes,
  bridgeId,
  children,
}: DetachedApp.ProviderProps) {
  const [app, setInfo] = useState<App.Type>(initialApp)
  const [banner, setBanner] = useState<{ node: ReactNode; target: string } | null>(null)
  const [dialog, setDialog] = useState<ReactNode>(null)
  const timeline = useRef<HTMLDivElement>(null as unknown as HTMLDivElement)
  const [highlightsOverlay, setHighlightsOverlay] = useState<ReactNode>(null)

  // Initialize DataStore notes in the detached window context
  useEffect(() => {
    DataStore.notes = [...initialNotes]
  }, []) // Only on mount

  // Create a stable Info instance for the detached window
  const infoRef = useRef<Info | null>(null)
  if (!infoRef.current) {
    infoRef.current = new Info({ app, setInfo, timeline })
  } else {
    infoRef.current.app = app
    infoRef.current.setInfo = setInfo
  }
  const instance = infoRef.current

  // Listen for incoming BroadcastChannel messages from the main tab
  useEffect(() => {
    const bridge = WindowBridge.create(bridgeId, (message) => {
      switch (message.type) {
        case WindowBridge.MessageType.THEME_CHANGE: {
          const { theme } = message.payload as WindowBridge.ThemeChangePayload
          // Set data-theme attribute; full CSS variable sync is handled by
          // direct DOM access via applyThemeToWindow in Navigator.tsx
          document.documentElement.setAttribute('data-theme', theme)
          break
        }
        case WindowBridge.MessageType.NOTES_CHANGED: {
          const payload = message.payload as WindowBridge.NotesChangedPayload
          if (payload.action === 'created' && payload.notes) {
            payload.notes.forEach(note => {
              const idx = DataStore.notes.findIndex(n => n.id === note.id)
              if (idx >= 0) {
                DataStore.notes[idx] = note
              } else {
                DataStore.notes.push(note)
              }
            })
          } else if (payload.action === 'deleted' && payload.ids) {
            payload.ids.forEach(id => {
              const idx = DataStore.notes.findIndex(n => n.id === id)
              if (idx >= 0) DataStore.notes.splice(idx, 1)
            })
          }
          Note.Entity.invalidateCache()
          RenderEngine.clearAllCaches()
          DataStore.markDirty()
          // Trigger re-render in this window
          setInfo(prev => ({
            ...prev,
            timeline: {
              ...prev.timeline,
              renderVersion: prev.timeline.renderVersion + 1,
            },
          }))
          break
        }
        case WindowBridge.MessageType.RENDER_REQUEST: {
          const { renderVersion } = message.payload as WindowBridge.RenderRequestPayload
          setInfo(prev => ({
            ...prev,
            timeline: {
              ...prev.timeline,
              renderVersion,
            },
          }))
          break
        }
        case WindowBridge.MessageType.APP_SNAPSHOT: {
          const { app: snapshot } = message.payload as WindowBridge.AppSnapshotPayload
          setInfo(prev => ({ 
            ...prev, 
            ...snapshot,
            target: snapshot.target ? {
              ...prev.target,
              ...snapshot.target
            } : prev.target
          }))
          break
        }
      }
    })

    return () => {
      bridge.destroy()
    }
  }, [bridgeId])

  const spawnBanner = useCallback(
    (node: ReactNode, target: string = 'main') => {
      setBanner({ node, target })
    },
    [],
  )

  const destroyBanner = useCallback(() => {
    setBanner(null)
  }, [])

  const spawnDialog = useCallback((dialog: ReactNode) => {
    setDialog(dialog)
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
    ],
  )

  return (
    <Application.Context.Provider value={props}>
      {children}
    </Application.Context.Provider>
  )
}
