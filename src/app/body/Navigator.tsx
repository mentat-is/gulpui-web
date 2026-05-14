import { cn } from '@impactium/utils'
import s from './styles/Navigator.module.css'
import { Application } from '@/context/Application.context'
import { useScroll, scrollStore } from '@/store/scroll.store'
import { ChangeEvent, KeyboardEvent as ReactKeyboardEvent, ReactNode, RefObject, useCallback, useEffect, useRef, useState } from 'react'
import { DisplayEventDialog } from '@/dialogs/Event.dialog'
import ReactDOM from 'react-dom/client'
import { NotesWindow } from '@/components/NotesWindow'
import { TableViewWindow } from '@/components/TableViewWindow'
import { Popover } from '@/ui/Popover'
import { Logger } from '@/dto/Logger.class'
import { Highlights } from '@/overlays/Highlights'
import { Switch } from '@/ui/Switch'
import { Label } from '@/ui/Label'
import { Stack } from '@/ui/Stack'
import { Button } from '@/ui/Button'
import { Input } from '@/ui/Input'
import { Context } from '@/entities/Context'
import { Note } from '@/entities/Note'
import { Doc } from '@/entities/Doc'
import { Operation } from '@/entities/Operation'
import { App } from '@/entities/App'
import { useTheme } from 'next-themes'
import { AIAssistant } from '@/banners/AIAssistant.banner'
import { FloatingWindow } from '@/ui/FloatingWindow'
import { Extension } from '@/context/Extension.context'
import { Filter } from '@/entities/Filter'
import { Source } from '@/entities/Source'
import { WindowBridge } from '@/lib/WindowBridge'
import { DetachedAppProvider } from '@/context/DetachedApp.provider'
import { DataStore } from '@/store/DataStore'
import { RenderEngine } from '@/class/RenderEngine'
import { NotePoint } from '@/ui/Note'
import { AIAssistantWindow } from '@/components/AIAssistantWindow'

/**
 * FetchEventBannerMain — fetches a note-linked event from the server and opens its dialog
 * in the main tab. Triggered when the detached NotesWindow sends TARGET_NOTE for an event
 * that is not currently loaded in the main tab's timeline.
 *
 * @param docId - The document ID of the event to fetch.
 * @param operationId - The operation ID under which the event was ingested.
 */
function FetchEventBannerMain({ docId, operationId }: { docId: Doc.Id; operationId: Operation.Id }) {
  // Construct a minimal Note.Type shell so we can reuse the existing FetchEventBanner component.
  const shell = {
    doc: { _id: docId },
    operation_id: operationId,
    name: docId,
  } as unknown as Note.Type

  return <NotePoint.FetchEventBanner note={shell} />
}

export namespace Navigator {
  export interface Props extends Stack.Props {
    timeline: RefObject<HTMLDivElement>
    timestamp: number
  }
}


export function Navigator({
  timeline,
  className,
  timestamp: _timestamp,
  ...props
}: Navigator.Props) {
  const { Info, app, spawnDialog, spawnBanner, setHighlightsOverlay } = Application.use()
  const { x: scrollX } = useScroll()
  const [timestamp, setTimestamp] = useState<number>(_timestamp)
  const [timestampInputValid, setTimestampInputValid] = useState<boolean>(true)
  const { theme } = useTheme()

  const [filterMode, setFilterMode] = useState<'files' | 'events'>('files');
  const EVENT_FILTER_ID = 'navigator-event-filter' as Filter.Id;

  const [localFilterValue, setLocalFilterValue] = useState(app.timeline.filter);

  // Sync local filter value with global app state
  useEffect(() => {
    setLocalFilterValue(app.timeline.filter);
  }, [app.timeline.filter]);

  useEffect(() => {
    setTimestamp(_timestamp)
  }, [_timestamp])

  const resetTimestamp = () => {
    setTimestampInputValid(false)
    setTimestamp(0)
  }

  function applyThemeToWindow(sourceDoc: Document, targetDoc: Document, theme: string | undefined) {
    const sourceRoot = sourceDoc.documentElement
    const targetRoot = targetDoc.documentElement

    // use data-theme
    targetRoot.setAttribute('data-theme', theme ?? 'dark')

    // copy css style
    const styles = getComputedStyle(sourceRoot)
    for (let i = 0; i < styles.length; i++) {
      const key = styles[i]
      if (key.startsWith('--')) {
        targetRoot.style.setProperty(key, styles.getPropertyValue(key))
      }
    }
  }

  const handleTimestampChangeHandler = (ev: ChangeEvent<HTMLInputElement>) => {
    const { value } = ev.target
    const limits = Context.Entity.frame(app)
    if (!value) {
      Logger.error(`Expected number, got ${value}`, 'Navigator.handleTimestampChangeHandler');
      resetTimestamp();
      return;
    }

    const num = parseInt(value)
    if (isNaN(num) || num < 0) {
      Logger.error(
        `Expected number, got ${num}`,
        'Navigator.handleTimestampChangeHandler',
      )
      resetTimestamp()
      return
    }

    setTimestampInputValid(num < limits.max && num > limits.min)
    setTimestamp(num)
  }

  const resetTimestampToInitialValue = () => {
    setTimestamp(_timestamp)
    setTimestampInputValid(true)
  }

  const goToTimestamp = () => {
    // @ts-ignore
    return window.focusCanvasOnEvent(timestamp, true)
  }

  const [windowRef, setWindowRef] = useState<Window | null>(null)
  const notesRootRef = useRef<ReactDOM.Root | null>(null)
  const initialOperationRef = useRef<string | null | undefined>(undefined)

  /**
   * Stable refs for spawnDialog, spawnBanner, and app used inside the BroadcastChannel callback.
   * The callback is registered once (deps: []) and must not capture stale closures.
   * Using refs ensures it always calls the latest version of these functions/values.
   */
  const appRef = useRef<App.Type>(app)
  appRef.current = app
  const spawnDialogRef = useRef<(node: ReactNode) => void>(spawnDialog)
  spawnDialogRef.current = spawnDialog
  const spawnBannerRef = useRef<(node: ReactNode) => void>(spawnBanner)
  spawnBannerRef.current = spawnBanner

  const mainBridgeIdRef = useRef(WindowBridge.generateId())
  const mainBridgeRef = useRef<ReturnType<typeof WindowBridge.create> | null>(null)

  useEffect(() => {
    const bridge = WindowBridge.create(mainBridgeIdRef.current, (message) => {
      switch (message.type) {
        case WindowBridge.MessageType.FLAGS_CHANGED: {
          // Flag changes from detached window — re-render canvas
          RenderEngine.clearAllCaches()
          DataStore.markDirty()
          Info.render()
          break
        }
        case WindowBridge.MessageType.BANNER_ACTION: {
          const payload = message.payload as WindowBridge.BannerActionPayload
          if (payload.action === 'destroy') {
            // No-op for main tab banner system
          }
          break
        }
        case WindowBridge.MessageType.TARGET_NOTE: {
          // Detached NotesWindow requested to open an event dialog in the main tab.
          // We resolve the event from the main tab's app state at call time via appRef.
          const { docId, operationId } = message.payload as WindowBridge.TargetNotePayload
          const event = Doc.Entity.id(appRef.current, docId)
          if (event) {
            spawnDialogRef.current(<DisplayEventDialog event={event} />)
          } else {
            // Event not loaded in main tab — fetch it from the server
            spawnBannerRef.current(<FetchEventBannerMain docId={docId} operationId={operationId} />)
          }
          break
        }
      }
    })
    mainBridgeRef.current = bridge

    return () => {
      bridge.destroy()
      mainBridgeRef.current = null
    }
  }, [])

  // Forward theme changes to all detached windows via BroadcastChannel
  useEffect(() => {
    mainBridgeRef.current?.send(WindowBridge.MessageType.THEME_CHANGE, { theme: theme ?? 'dark' })
  }, [theme])

  // Sync operations, contexts, and files to detached windows so they can update their lists
  useEffect(() => {
    console.warn("APP_SNAPSHOT", app.target.filters)
    const selectedSourceIds = app.target.files.filter((f: Source.Type) => f.selected).map((f: Source.Type) => f.id);
      mainBridgeRef.current?.send(WindowBridge.MessageType.APP_SNAPSHOT, {
        app: {
          target: {
            operations: app.target.operations,
            events: new Map(), // Omit events map as it cannot be cloned over BroadcastChannel
            filters: app.target.filters,
          },
        } as any,
        selectedSourceIds
      });
  }, [app.target.files, app.target.operations, app.target.contexts, app.target.filters, app.timeline.filter]);

  // Sync timeline selection to detached windows
  useEffect(() => {
    mainBridgeRef.current?.send(WindowBridge.MessageType.EVENT_SELECTED, {
      event: app.timeline.target
    })
  }, [app.timeline.target]) 

  /**
   * Copies stylesheets from the main document into a detached window.
   * Runs once at window creation time (not reactively).
   */
  const copyStylesToWindow = useCallback((targetWindow: Window) => {
    applyThemeToWindow(document, targetWindow.document, theme)

    Array.from(document.styleSheets).forEach((styleSheet: CSSStyleSheet) => {
      try {
        if (styleSheet.href) {
          const link = document.createElement('link')
          link.rel = 'stylesheet'
          link.href = styleSheet.href
          targetWindow.document.head.appendChild(link)
        } else if (styleSheet.cssRules) {
          const style = document.createElement('style')
          Array.from(styleSheet.cssRules).forEach((rule) => {
            style.appendChild(document.createTextNode(rule.cssText))
          })
          targetWindow.document.head.appendChild(style)
        }
      } catch (err) {
        console.warn('error copying style', err)
      }
    })
  }, [theme])

  const openWindow = () => {
    if (windowRef) {
      notesRootRef.current?.unmount()
      notesRootRef.current = null
      windowRef.close()
    }

    const newWindow = window.open(
      '',
      '',
      'width=600,height=450,left=100,top=100',
    )
    if (!newWindow) return

    const container = document.createElement('div')
    newWindow.document.body.appendChild(container)

    copyStylesToWindow(newWindow)

    // Create a SEPARATE React root — this is the key performance fix.
    // The NotesWindow will have its own React reconciliation, completely
    // independent from the main tab's React tree.
    const detachedBridgeId = WindowBridge.generateId()
    const root = ReactDOM.createRoot(container)
    root.render(
      <DetachedAppProvider
        initialApp={app}
        initialNotes={[...DataStore.notes]}
        bridgeId={detachedBridgeId}
      >
        <NotesWindow onClose={() => {
          newWindow.close()
        }} />
      </DetachedAppProvider>
    )
    notesRootRef.current = root
    setWindowRef(newWindow)
  }

  useEffect(() => {
    if (windowRef) {
      const handleBeforeUnload = () => {
        notesRootRef.current?.unmount()
        notesRootRef.current = null
        setWindowRef(null)
      }

      windowRef.addEventListener('beforeunload', handleBeforeUnload)

      return () => {
        windowRef.removeEventListener('beforeunload', handleBeforeUnload)
      }
    }
  }, [windowRef])

  // Sync theme to NotesWindow via direct DOM access (same-origin window.open).
  // TIMING: Deferred via rAF because getComputedStyle() inside applyThemeToWindow
  // needs the browser to have recalculated CSS variables after next-themes sets
  // the new data-theme attribute. Without this, we'd read the OLD theme's values.
  useEffect(() => {
    if (!windowRef) return
    const id = requestAnimationFrame(() => {
      applyThemeToWindow(document, windowRef.document, theme)
    })
    return () => cancelAnimationFrame(id)
  }, [theme, windowRef])

  const closeWindow = () => {
    if (windowRef) {
      notesRootRef.current?.unmount()
      notesRootRef.current = null
      windowRef.close()
      setWindowRef(null)
    }
  }

  const [tableWindowRef, setTableWindowRef] = useState<Window | null>(null)
  const tableRootRef = useRef<ReactDOM.Root | null>(null)

  const openTableWindow = useCallback((sourceId?: Source.Id) => {
    if (tableWindowRef) {
      tableRootRef.current?.unmount()
      tableRootRef.current = null
      tableWindowRef.close()
    }

    const newWindow = window.open(
      '',
      '',
      'width=800,height=600,left=150,top=150',
    )
    if (!newWindow) return

    const container = document.createElement('div')
    newWindow.document.body.appendChild(container)

    copyStylesToWindow(newWindow)

    // Create a SEPARATE React root for the table view window.
    const detachedBridgeId = WindowBridge.generateId()
    const root = ReactDOM.createRoot(container)
    root.render(
      <DetachedAppProvider
        initialApp={app}
        initialNotes={[...DataStore.notes]}
        bridgeId={detachedBridgeId}
      >
        <TableViewWindow
          initialSourceId={sourceId}
          onClose={() => {
            newWindow.close()
          }}
        />
      </DetachedAppProvider>
    )
    tableRootRef.current = root
    setTableWindowRef(newWindow)
  }, [theme, tableWindowRef, app, copyStylesToWindow])

  useEffect(() => {
    if (tableWindowRef) {
      const handleBeforeUnload = () => {
        tableRootRef.current?.unmount()
        tableRootRef.current = null
        setTableWindowRef(null)
      }

      tableWindowRef.addEventListener('beforeunload', handleBeforeUnload)

      return () => {
        tableWindowRef.removeEventListener('beforeunload', handleBeforeUnload)
      }
    }
  }, [tableWindowRef, Info])

  // Sync theme to TableViewWindow via direct DOM access (same-origin window.open).
  // Same rAF deferral as NotesWindow above.
  useEffect(() => {
    if (!tableWindowRef) return
    const id = requestAnimationFrame(() => {
      applyThemeToWindow(document, tableWindowRef.document, theme)
    })
    return () => cancelAnimationFrame(id)
  }, [theme, tableWindowRef])

  const closeTableWindow = useCallback(() => {
    if (tableWindowRef) {
      tableRootRef.current?.unmount()
      tableRootRef.current = null
      tableWindowRef.close()
      setTableWindowRef(null)
    }
  }, [tableWindowRef, Info])

  const [freeChatWindowRef, setFreeChatWindowRef] = useState<Window | null>(null)
  const freeChatRootRef = useRef<ReactDOM.Root | null>(null)

  const [proChatWindowRef, setProChatWindowRef] = useState<Window | null>(null)
  const proChatRootRef = useRef<ReactDOM.Root | null>(null)

  const openChatWindow = useCallback((mode: 'free' | 'pro') => {
    const isPro = mode === 'pro'
    const windowRef = isPro ? proChatWindowRef : freeChatWindowRef
    const rootRef = isPro ? proChatRootRef : freeChatRootRef
    const setWindowRef = isPro ? setProChatWindowRef : setFreeChatWindowRef

    if (windowRef && !windowRef.closed) {
      windowRef.focus()
      return
    }

    const newWindow = window.open(
      '',
      isPro ? 'GulpAIAssistantPro' : 'GulpAIAssistant',
      'width=480,height=800,left=120,top=120',
    )
    if (!newWindow) return

    const container = document.createElement('div')
    newWindow.document.body.innerHTML = ''
    newWindow.document.body.appendChild(container)

    copyStylesToWindow(newWindow)

    const detachedBridgeId = WindowBridge.generateId()
    const root = ReactDOM.createRoot(container)
    root.render(
      <DetachedAppProvider
        initialApp={app}
        initialNotes={[...DataStore.notes]}
        bridgeId={detachedBridgeId}
      >
        <AIAssistantWindow
          mode={mode}
          onClose={() => {
            newWindow.close()
          }}
        />
      </DetachedAppProvider>
    )
    rootRef.current = root
    setWindowRef(newWindow)
  }, [theme, freeChatWindowRef, proChatWindowRef, app, copyStylesToWindow])

  // Sync theme to AI Assistant windows
  useEffect(() => {
    if (freeChatWindowRef && !freeChatWindowRef.closed) {
      const id = requestAnimationFrame(() => {
        applyThemeToWindow(document, freeChatWindowRef.document, theme)
      })
      return () => cancelAnimationFrame(id)
    }
  }, [theme, freeChatWindowRef])

  useEffect(() => {
    if (proChatWindowRef && !proChatWindowRef.closed) {
      const id = requestAnimationFrame(() => {
        applyThemeToWindow(document, proChatWindowRef.document, theme)
      })
      return () => cancelAnimationFrame(id)
    }
  }, [theme, proChatWindowRef])

  useEffect(() => {
    if (freeChatWindowRef) {
      const handleBeforeUnload = () => {
        freeChatRootRef.current?.unmount()
        freeChatRootRef.current = null
        setFreeChatWindowRef(null)
      }
      freeChatWindowRef.addEventListener('beforeunload', handleBeforeUnload)
      return () => freeChatWindowRef.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [freeChatWindowRef])

  useEffect(() => {
    if (proChatWindowRef) {
      const handleBeforeUnload = () => {
        proChatRootRef.current?.unmount()
        proChatRootRef.current = null
        setProChatWindowRef(null)
      }
      proChatWindowRef.addEventListener('beforeunload', handleBeforeUnload)
      return () => proChatWindowRef.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [proChatWindowRef])

  useEffect(() => {
    if (app.general.tableViewSource) {
      if (!tableWindowRef) {
        openTableWindow(app.general.tableViewSource.id)
      } else {
        tableWindowRef.focus()
        mainBridgeRef.current?.send(WindowBridge.MessageType.TABLE_SELECT_SOURCE, {
          sourceId: app.general.tableViewSource.id
        })
      }
      // Reset the one-shot signal
      Info.setInfoByKey(null, 'general', 'tableViewSource')
    }
  }, [app.general.tableViewSource, tableWindowRef, openTableWindow, Info])

  // Auto-close all detached windows when the user changes operation or logs out.
  // Notes and source events are operation-scoped, so stale detached tabs would
  // show incorrect data or trigger React errors with missing entities.
  const selectedOperationId = app.target.operations.find(o => o.selected)?.id
  const currentUser = app.general.user

  useEffect(() => {
    // Skip the initial mount — only react to subsequent changes
    if (initialOperationRef.current === undefined) {
      initialOperationRef.current = selectedOperationId ?? null
      return
    }

    if (selectedOperationId !== initialOperationRef.current) {
      // Operation changed — close Notes window, but keep Table window open
      if (windowRef) closeWindow()
      // Send APP_SNAPSHOT is already handled natively by Application.provider but DetachedApp
      // needs to just receive it without closing the window. Table window resets itself.
      initialOperationRef.current = selectedOperationId ?? null
    }
  }, [selectedOperationId])

  useEffect(() => {
    if (!currentUser) {
      // User logged out — close all detached windows
      if (windowRef) closeWindow()
      if (tableWindowRef) closeTableWindow()
      if (freeChatWindowRef) {
        freeChatRootRef.current?.unmount()
        freeChatRootRef.current = null
        freeChatWindowRef.close()
        setFreeChatWindowRef(null)
      }
      if (proChatWindowRef) {
        proChatRootRef.current?.unmount()
        proChatRootRef.current = null
        proChatWindowRef.close()
        setProChatWindowRef(null)
      }
    }
  }, [currentUser, freeChatWindowRef, proChatWindowRef, tableWindowRef, windowRef])

  const size_plus = useRef<HTMLButtonElement>(null)
  const size_reset = useRef<HTMLButtonElement>(null)
  const size_minus = useRef<HTMLButtonElement>(null)

  const resetScaleAndScroll = () => {
    Info.setTimelineScale(1)
    scrollStore.setScrollX(0)
  }

  const zoom = (out = false) => {
    const timelineWidth = timeline.current?.clientWidth || 1
    const currentScale = app.timeline.scale

    const newScale = out
      ? currentScale - currentScale / 4
      : currentScale + currentScale / 4

    const clampedScale = Math.min(Math.max(newScale, 0.01), 9999999)

    const centerOffset = scrollX + timelineWidth / 2
    const scaledOffset = (centerOffset * clampedScale) / currentScale
    const left = scaledOffset - centerOffset

    Info.setTimelineScale(clampedScale)
    scrollStore.setScrollX(x => Math.round(x + left))
  }

  const handleControllers = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement;
    const tag = target.tagName.toLowerCase();
    if (['input', 'textarea', 'select'].includes(tag) || target.isContentEditable) return;


    switch (true) {
      case event.key === '-':
        size_plus.current?.click()
        break

      case event.key === '=':
        size_minus.current?.click()
        break

      case event.key === '+':
        resetScaleAndScroll()
        break

      default:
        break
    }
  }

  useEffect(() => {
    window.addEventListener('keypress', handleControllers)

    return () => {
      window.removeEventListener('keypress', handleControllers)
    }
  }, [])

  const createHighlightButtonClickHandler = () => {
    setHighlightsOverlay(prev => prev ? null : <Highlights.Create.Overlay />)
  }

  /**
   * Triggers the search based on the current mode and value.
   * For 'files' mode, it updates the global timeline filter.
   * For 'events' mode, it updates OpenSearch filters and triggers a refetch.
   * @param value The search term.
   * @param mode The current filter mode ('files' or 'events').
   */
  const triggerSearch = useCallback((value: string, mode: 'files' | 'events') => {
    if (mode === 'files') {
      Info.setTimelineFilter(value);
      scrollStore.setScroll(0, -26);
    } else {
      let hasChanges = false;
      const sources = Source.Entity.selected(app);
      if (sources.length === 0) return;

      sources.forEach((source: Source.Type) => {
        const query = Info.getQuery(source);
        const existingFilterIndex = query.filters.findIndex(f => f.id === EVENT_FILTER_ID);
        const trimmedValue = value.trim();

        if (trimmedValue === '') {
          if (existingFilterIndex !== -1) {
            query.filters.splice(existingFilterIndex, 1);
            Info.setQuery(source, query);
            hasChanges = true;
          }
        } else {
          const newFilter: Filter.Type = {
            id: EVENT_FILTER_ID,
            type: 'wildcard' as any,
            operator: 'must' as any,
            field: 'event.original',
            value: trimmedValue,
            enabled: true,
            case_insensitive: true,
          };

          if (existingFilterIndex !== -1) {
            query.filters[existingFilterIndex] = newFilter;
          } else {
            query.filters.push(newFilter);
          }
          Info.setQuery(source, query);
          hasChanges = true;
        }
      });

      if (hasChanges) {
        Info.refetch({ ids: sources.map((s: Source.Type) => s.id) });
        scrollStore.setScroll(0, -26);
      }
    }
  }, [app, Info, EVENT_FILTER_ID]);

  /**
   * Handles filter input changes.
   * Triggers instant auto-search in 'files' mode, but waits for manual trigger in 'events' mode.
   * @param e Change event from the input.
   */
  const handleFilterChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalFilterValue(value);
    if (filterMode === 'files') {
      Info.setTimelineFilter(value);
      scrollStore.setScroll(0, -26);
    }
  }

  /**
   * Handles key down events on the search input.
   * Triggers search when 'Enter' is pressed.
   * @param e Keyboard event from the input.
   */
  const handleKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      triggerSearch(localFilterValue, filterMode);
    }
  }

  /**
   * Toggles between 'files' and 'events' filter modes.
   * When switching back to 'files', it clears any active event filters.
   */
  const handleIconClick = useCallback(() => {
    const nextMode = filterMode === 'files' ? 'events' : 'files';

    // Reset input value when switching modes to provide a clean state for the new mode
    setLocalFilterValue('');
    Info.setTimelineFilter('');

    if (filterMode === 'events') {
      // Cleanup: remove event filters when switching back to file filtering
      let hasChanges = false;
      const sources = Source.Entity.selected(app);
      sources.forEach((source: Source.Type) => {
        const query = Info.getQuery(source);
        const existingFilterIndex = query.filters.findIndex(f => f.id === EVENT_FILTER_ID);
        if (existingFilterIndex !== -1) {
          query.filters.splice(existingFilterIndex, 1);
          Info.setQuery(source, query);
          hasChanges = true;
        }
      });

      if (hasChanges) {
        Info.refetch({ ids: sources.map((s: Source.Type) => s.id) });
      }
    }

    setFilterMode(nextMode);
  }, [filterMode, app, Info, EVENT_FILTER_ID]);



  const { extensions } = Extension.use();
  const hasPro = !!extensions['AIAssistantPro.banner.tsx'];
  const [chatMode, setChatMode] = useState<'free' | 'pro'>('free'); // Default to free, but will be set by selection
  const [selectionOpen, setSelectionOpen] = useState(false);

  const handleChatButtonClick = () => {
    if (hasPro) {
      setSelectionOpen(true);
    } else {
      openChatWindow('free');
    }
  };

  const selectChat = (mode: 'free' | 'pro') => {
    openChatWindow(mode);
    setSelectionOpen(false);
  };


  return (
    <Stack
      pos="relative"
      gap={5}
      flex={0}
      className={cn(className, s.navigator)}
      {...props}
    >
      <Button
        variant="secondary"
        title='Zoom in'
        ref={size_minus}
        onClick={() => zoom(false)}
        icon="ZoomIn"
        size='md'
      />
      <Button
        variant="secondary"
        title='Zoom out'
        ref={size_plus}
        onClick={() => zoom(true)}
        icon="ZoomOut"
        size='md'
      />
      <Button
        variant="secondary"
        title='Reset scale'
        ref={size_reset}
        onClick={resetScaleAndScroll}
        icon="AlignHorizontalSpaceBetween"
        size='md'
      />
      <Button
        variant="secondary"
        title='Create highlight'
        icon="ChartBarBig"
        onClick={createHighlightButtonClickHandler}
        size='md'
      />
      <Input
        className={s.filter}
        variant='highlighted'
        value={localFilterValue}
        placeholder={filterMode === 'files' ? 'Filter by filenames and context' : 'Filter Events by raw logs'}
        onChange={handleFilterChange}
        onKeyDown={handleKeyDown}
        icon={filterMode === 'files' ? 'Filter' : 'Activity'}
        onIconClick={handleIconClick}
        iconTitle={filterMode === 'files' ? 'Switch to Event Filtering' : 'Switch to File Filtering'}
      />
      <Button
        variant="secondary"
        title="Search"
        icon="Search"
        onClick={() => triggerSearch(localFilterValue, filterMode)}
        size='md'
      />
      <Button
        variant="secondary"
        title="Open notes banner in new window"
        icon="PictureInPicture2"
        onClick={openWindow}
        size='md'
      />
      <Popover.Root>
        <Popover.Trigger asChild>
          <Button
            size='md'
            variant="secondary"
            title='Visibility settings'
            icon={app.hidden.notes || app.hidden.links ? 'ToggleOffAlt' : 'ToggleOnAlt'}
            className={cn(s.notes_visibility)}
          />
        </Popover.Trigger>
        <Popover.Content>
          <Stack dir='column' gap={4} ai='stretch'>
            {(Object.keys(app.hidden) as unknown as Array<keyof App.Type['hidden']>).map((key) => {
              return (
                <Stack key={key} jc='space-between'>
                  <Label value={`Show ${key.replace(/([A-Z])/g, " $1").toLowerCase()}`} />
                  <Switch checked={!app.hidden[key]} onCheckedChange={() => Info.toggle_visibility(key)} />
                </Stack>
              )
            })}
          </Stack>
        </Popover.Content>
      </Popover.Root>
      <Popover.Root>
        <Popover.Trigger asChild>
          <Button size='md'
            variant="secondary"
            title="Go to timestamp"
            icon="Clock" />
        </Popover.Trigger>
        <Popover.Content className={s.goto}>
          <Stack dir="column" ai="flex-start">
            <p>Go to timestamp:</p>
            <Stack>
              <Input
                variant="highlighted"
                icon="Clock"
                value={timestamp}
                valid={timestampInputValid}
                onChange={handleTimestampChangeHandler}
              />
              <Button
                icon="Undo2"
                variant="secondary"
                onClick={resetTimestampToInitialValue}
              />
              <Button icon="Check" variant="glass" onClick={goToTimestamp} />
            </Stack>
          </Stack>
        </Popover.Content>
      </Popover.Root>
      {hasPro ? (
        <Popover.Root open={selectionOpen} onOpenChange={setSelectionOpen}>
          <Popover.Trigger asChild>
            <Button
              variant={selectionOpen ? 'default' : 'secondary'}
              title='Select chat version'
              icon='Sparkles'
              onClick={handleChatButtonClick}
              size='md'
            />
          </Popover.Trigger>
          <Popover.Content>
            <Stack dir='column' gap={3}>
              <Label value="Select chat version" />
              <Stack>
                <Button
                  variant="glass"
                  onClick={() => selectChat('free')}
                  icon="Sparkle"
                  title="Use Free Version"
                >
                  AIAssistant Chat
                </Button>
                <Button
                  variant="default"
                  onClick={() => selectChat('pro')}
                  icon="Sparkles"
                  title="Use Pro Version"
                >
                  AIAssistant Pro
                </Button>
              </Stack>
            </Stack>
          </Popover.Content>
        </Popover.Root>
      ) : (
        <Button
          variant='secondary'
          title='Open AI Assistant Chat'
          icon='Sparkle'
          onClick={handleChatButtonClick}
          size='md'
        />
      )}
      <Button
        variant='secondary'
        title='Open table view in new window'
        icon='Table'
        onClick={() => openTableWindow()}
        size='md'
      />
      {/* Detached windows now use separate React roots via createRoot.
          They are no longer part of this React tree — see openWindow() and openTableWindow(). */}
    </Stack>
  )
}
